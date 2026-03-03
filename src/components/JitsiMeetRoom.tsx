import { useEffect, useRef } from "react";

interface JitsiMeetRoomProps {
  roomId: string;
  displayName: string;
  onClose: () => void;
  onConferenceJoined?: () => void;
}

const JitsiMeetRoom = ({ roomId, displayName, onClose, onConferenceJoined }: JitsiMeetRoomProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    const loadJitsi = () => {
      if (!containerRef.current) return;

      const domain = "meet.jit.si";
      const options = {
        roomName: roomId,
        parentNode: containerRef.current,
        userInfo: {
          displayName,
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          lobbyModeEnabled: false,
          enableLobbyChat: false,
          hideLobbyButton: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "participants-pane",
            "tileview",
            "hangup",
          ],
        },
      };

      // @ts-ignore - Jitsi external API
      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

      apiRef.current.addEventListener("readyToClose", () => {
        onClose();
      });

      apiRef.current.addEventListener("videoConferenceJoined", () => {
        onConferenceJoined?.();
      });
    };

    // Load the Jitsi IFrame API script if not already loaded
    if (!(window as any).JitsiMeetExternalAPI) {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = loadJitsi;
      document.head.appendChild(script);
    } else {
      loadJitsi();
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomId, displayName, onClose, onConferenceJoined]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-border bg-muted"
      style={{ height: "70vh" }}
    />
  );
};

export default JitsiMeetRoom;
