import { createContext, useContext, useState, ReactNode } from 'react'
import { NotificationToast } from '../components/NotificationToast'

// Define type locally to avoid module resolution issues
export type NotificationType = 'success' | 'error' | 'info' | 'payment'

interface Notification {
  id: string
  message: string
  type: NotificationType
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = (message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substring(7)
    setNotifications(prev => [...prev, { id, message, type }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map(notif => (
        <NotificationToast
          key={notif.id}
          message={notif.message}
          type={notif.type}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
