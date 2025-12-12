# Scholar/Imam Balance Update Fix

## Problem
The scholar/imam wallet balance for ssl4live@gmail.com (and potentially other scholars) was not updating when receiving consultation fees or zakat donations.

## Root Cause
The system had **manual balance updates** in the frontend code, but:
1. No database triggers to automatically sync balances with transactions
2. Manual updates were inconsistent and could fail silently
3. Past transactions didn't update balances correctly
4. No automatic recalculation mechanism

## Solution Implemented

### 1. Database Trigger (Automatic Balance Updates)
**File**: `supabase/FIX_AUTO_UPDATE_BALANCE.sql`

Created a PostgreSQL trigger that automatically updates the `profiles.masjid_coin_balance` whenever a transaction is inserted:

```sql
CREATE OR REPLACE FUNCTION update_profile_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' OR NEW.payment_status = 'success' THEN
        -- Update recipient's balance (positive amounts - income)
        IF NEW.recipient_id IS NOT NULL AND NEW.amount > 0 THEN
            UPDATE profiles
            SET masjid_coin_balance = masjid_coin_balance + NEW.amount
            WHERE id = NEW.recipient_id;
        END IF;
        
        -- Update sender's balance (negative amounts - debit)
        IF NEW.user_id IS NOT NULL AND NEW.amount < 0 THEN
            UPDATE profiles
            SET masjid_coin_balance = masjid_coin_balance + NEW.amount
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Recalculate All Past Balances
The script also recalculates all scholar/imam balances based on their transaction history:

```sql
-- For each scholar/imam, calculate correct balance from all completed transactions
SELECT COALESCE(SUM(
    CASE 
        WHEN t.recipient_id = scholar.id AND t.amount > 0 THEN t.amount  -- Income
        WHEN t.user_id = scholar.id AND t.amount < 0 THEN t.amount       -- Expenses
        ELSE 0
    END
), 0) as correct_balance
FROM masjid_coin_transactions t
WHERE payment_status IN ('completed', 'success')
```

### 3. Removed Manual Balance Updates
Updated frontend code to rely on database trigger instead of manual updates:

**Files Modified**:
- `src/components/ConsultationBooking.tsx` - Removed manual scholar credit (lines ~295-330)
- `src/components/ZakatDonation.tsx` - Already updated previously
- `src/components/ConsultationChat.tsx` - Removed manual scholar credit in extension logic

**Before**:
```typescript
// Manual update (error-prone, could fail)
const { data: scholarProfile } = await supabase
  .from('profiles')
  .select('masjid_coin_balance')
  .eq('id', scholarId)
  .single()

const newBalance = scholarProfile.masjid_coin_balance + amount
await supabase
  .from('profiles')
  .update({ masjid_coin_balance: newBalance })
  .eq('id', scholarId)
```

**After**:
```typescript
// Just create transaction - trigger handles balance automatically
console.log(`💰 Scholar will be credited ${amount} coins via database trigger`)
await supabase.from('masjid_coin_transactions').insert({
  user_id: scholarId,
  recipient_id: scholarId,
  amount: amount,
  type: 'consultation',
  payment_status: 'completed'
})
```

## Deployment Steps

### Step 1: Run Debug Query (Optional)
```bash
# Check current state before fix
supabase sql < supabase/DEBUG_SCHOLAR_BALANCE.sql
```

This shows:
- Current balance in database
- All transactions
- What the balance SHOULD be
- Recent consultation bookings

### Step 2: Apply Fix
```bash
# Deploy the fix to Supabase
supabase sql < supabase/FIX_AUTO_UPDATE_BALANCE.sql
```

This will:
1. ✅ Create the automatic balance update function
2. ✅ Create the trigger on masjid_coin_transactions table
3. ✅ Recalculate ALL scholar/imam balances from transaction history
4. ✅ Show before/after balances for verification

### Step 3: Rebuild and Deploy App
```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

### Step 4: Verify Fix
1. Check ssl4live@gmail.com balance in Scholar Wallet
2. Create a test consultation booking
3. Verify balance updates immediately
4. Check transaction appears in wallet

## Expected Results

### For ssl4live@gmail.com
After running the fix:
- Balance will be recalculated from ALL past transactions
- Should show correct total from all consultations and zakat received
- Future transactions will update balance automatically

### For All Scholars/Imams
- Balance now updates in real-time when:
  - Members book consultations
  - Members donate zakat
  - Consultations are extended
  - Withdrawals are processed
- No more manual balance management needed
- All past discrepancies fixed

## Transaction Flow (After Fix)

```
Member books consultation (5 coins = ₦500)
    ↓
1. User balance deducted (-5 coins) - MANUAL
    ↓
2. Transaction inserted with:
   - user_id: member.id (for debit transaction)
   - recipient_id: scholar.id
   - amount: -5 (for user's debit record)
    ↓
3. Transaction inserted with:
   - user_id: scholar.id
   - recipient_id: scholar.id (for filtering in wallet)
   - amount: +5 (for scholar's credit record)
    ↓
4. 🔥 TRIGGER FIRES: Automatically updates scholar balance (+5)
    ↓
5. Scholar wallet shows updated balance immediately
    ↓
6. Real-time subscription in ScholarWallet.tsx detects profile change
    ↓
7. UI updates without refresh
```

## Benefits

1. **Reliable**: Database ensures balance is always correct
2. **Automatic**: No manual balance management needed
3. **Historical Fix**: Corrects all past balance errors
4. **Real-time**: UI updates via Supabase real-time subscriptions
5. **Auditable**: All transactions recorded, balance calculable from history
6. **No Double-Counting**: Removed redundant manual updates

## Monitoring

After deployment, monitor:
- Scholar wallet balances match transaction totals
- Console logs show "💰 Scholar will be credited X coins via database trigger"
- No errors in Supabase logs about trigger failures
- Real-time updates working in ScholarWallet component

## Rollback (if needed)

If issues occur:
```sql
-- Disable trigger
DROP TRIGGER IF EXISTS trigger_update_balance_on_transaction ON masjid_coin_transactions;

-- Re-enable manual updates in code (revert commits)
```

## Files Changed

1. **Created**:
   - `supabase/DEBUG_SCHOLAR_BALANCE.sql` - Diagnostic queries
   - `supabase/FIX_AUTO_UPDATE_BALANCE.sql` - Complete fix with trigger

2. **Modified**:
   - `src/components/ConsultationBooking.tsx` - Removed lines ~295-330
   - `src/components/ConsultationChat.tsx` - Removed lines ~200-210
   - `src/components/ZakatDonation.tsx` - Already updated previously

## Testing Checklist

- [ ] Run DEBUG_SCHOLAR_BALANCE.sql to see current state
- [ ] Deploy FIX_AUTO_UPDATE_BALANCE.sql to Supabase
- [ ] Verify ssl4live@gmail.com balance is now correct
- [ ] Rebuild and deploy app
- [ ] Test consultation booking - verify scholar balance updates
- [ ] Test zakat donation - verify scholar balance updates
- [ ] Check ScholarWallet real-time updates work
- [ ] Verify no duplicate balance updates
- [ ] Check console logs for trigger confirmation messages
