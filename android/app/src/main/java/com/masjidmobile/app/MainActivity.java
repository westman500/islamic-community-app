package com.masjidmobile.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.view.SurfaceView;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import io.agora.rtc2.Constants;
import io.agora.rtc2.IRtcEngineEventHandler;
import io.agora.rtc2.RtcEngine;
import io.agora.rtc2.RtcEngineConfig;
import io.agora.rtc2.video.VideoCanvas;
import io.agora.rtc2.ChannelMediaOptions;

public class MainActivity extends BridgeActivity {
    
    // Fill in the app ID from Agora Console
    private String myAppId = "1a3cb8e2d1174dd097edcc38466983a0";
    private RtcEngine mRtcEngine;
    private static final String TAG = "MainActivity";
    private static final int PERMISSION_REQ_ID = 100;
    
    // Event handler for Agora RTC engine
    private final IRtcEngineEventHandler mRtcEventHandler = new IRtcEngineEventHandler() {
        // Triggered when the local user successfully joins the specified channel.
        @Override
        public void onJoinChannelSuccess(String channel, int uid, int elapsed) {
            super.onJoinChannelSuccess(channel, uid, elapsed);
            Log.d(TAG, "Join channel success, uid: " + uid);
            showToast("Joined channel " + channel);
        }
        
        // Triggered when a remote user/host joins the channel.
        @Override
        public void onUserJoined(int uid, int elapsed) {
            super.onUserJoined(uid, elapsed);
            Log.d(TAG, "Remote user joined, uid: " + uid);
            runOnUiThread(() -> {
                // Initialize and display remote video view for the new user.
                setupRemoteVideo(uid);
                showToast("User joined: " + uid);
            });
        }
        
        // Triggered when a remote user/host leaves the channel.
        @Override
        public void onUserOffline(int uid, int reason) {
            super.onUserOffline(uid, reason);
            Log.d(TAG, "Remote user offline, uid: " + uid + " reason: " + reason);
            runOnUiThread(() -> {
                showToast("User offline: " + uid);
            });
        }
        
        @Override
        public void onLeaveChannel(RtcStats stats) {
            super.onLeaveChannel(stats);
            Log.d(TAG, "Leave channel success");
        }
    };
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check permissions and initialize Agora
        if (checkPermissions()) {
            startLiveStreaming();
        } else {
            requestPermissions();
        }
    }
    
    private void initializeAgoraVideoSDK() {
        try {
            RtcEngineConfig config = new RtcEngineConfig();
            config.mContext = getBaseContext();
            config.mAppId = myAppId;
            config.mEventHandler = mRtcEventHandler;
            mRtcEngine = RtcEngine.create(config);
            Log.d(TAG, "Agora RTC Engine initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing RTC engine: " + e.getMessage());
            throw new RuntimeException("Error initializing RTC engine: " + e.getMessage());
        }
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        
        // Clean up Agora resources
        cleanupAgoraEngine();
    }
    
    // Getter method for the RTC engine (can be used by Capacitor plugins)
    public RtcEngine getRtcEngine() {
        return mRtcEngine;
    }
    
    // Utility method for joining a channel following Agora documentation pattern
    public void joinChannel(String channelName, String token, boolean isHost) {
        if (mRtcEngine == null) {
            Log.e(TAG, "RTC Engine not initialized");
            return;
        }
        
        // Create an instance of ChannelMediaOptions and configure it
        ChannelMediaOptions options = new ChannelMediaOptions();
        
        // Set the user role to BROADCASTER or AUDIENCE according to the use-case
        if (isHost) {
            options.clientRoleType = Constants.CLIENT_ROLE_BROADCASTER;
            // Publish local media for hosts
            options.publishCameraTrack = true;
            options.publishMicrophoneTrack = true;
        } else {
            options.clientRoleType = Constants.CLIENT_ROLE_AUDIENCE;
            // Audience doesn't publish
            options.publishCameraTrack = false;
            options.publishMicrophoneTrack = false;
        }
        
        // In the live broadcast use-case, set the channelProfile to BROADCASTING
        options.channelProfile = Constants.CHANNEL_PROFILE_LIVE_BROADCASTING;
        
        // Set the latency level for audience
        options.audienceLatencyLevel = Constants.AUDIENCE_LATENCY_LEVEL_ULTRA_LOW_LATENCY;
        
        // Join the channel
        int result = mRtcEngine.joinChannel(token, channelName, 0, options);
        if (result == 0) {
            Log.d(TAG, "Joining channel: " + channelName + " as " + (isHost ? "host" : "audience"));
        } else {
            Log.e(TAG, "Failed to join channel, error code: " + result);
        }
    }
    
    // Utility method to leave channel
    public void leaveChannel() {
        if (mRtcEngine != null) {
            mRtcEngine.leaveChannel();
            Log.d(TAG, "Left channel");
        }
    }
    
    // Start live streaming functionality
    private void startLiveStreaming() {
        initializeAgoraVideoSDK();
        enableVideo();
        setupLocalVideo();
    }
    
    // Enable the video module
    private void enableVideo() {
        if (mRtcEngine != null) {
            mRtcEngine.enableVideo();
            mRtcEngine.startPreview();
        }
    }
    
    // Display the local video
    private void setupLocalVideo() {
        try {
            // For Capacitor apps, we'll use a programmatic approach
            // The actual video container will be handled by the web layer
            Log.d(TAG, "Local video setup - handled by web layer in Capacitor app");
        } catch (Exception e) {
            Log.e(TAG, "Error setting up local video: " + e.getMessage());
        }
    }
    
    // Display remote video
    private void setupRemoteVideo(int uid) {
        try {
            // For Capacitor apps, remote video is handled by the web layer
            Log.d(TAG, "Remote video setup for uid: " + uid + " - handled by web layer");
        } catch (Exception e) {
            Log.e(TAG, "Error setting up remote video: " + e.getMessage());
        }
    }
    
    // Clean up Agora engine
    private void cleanupAgoraEngine() {
        if (mRtcEngine != null) {
            mRtcEngine.stopPreview();
            mRtcEngine.leaveChannel();
            RtcEngine.destroy();
            mRtcEngine = null;
        }
    }
    
    // Permission handling methods
    private boolean checkPermissions() {
        for (String permission : getRequiredPermissions()) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }
    
    private String[] getRequiredPermissions() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            return new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.BLUETOOTH_CONNECT
            };
        } else {
            return new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA
            };
        }
    }
    
    private void requestPermissions() {
        requestPermissions(getRequiredPermissions(), PERMISSION_REQ_ID);
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQ_ID && checkPermissions()) {
            startLiveStreaming();
        }
    }
    
    // Utility method to show toast messages
    private void showToast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }
}
