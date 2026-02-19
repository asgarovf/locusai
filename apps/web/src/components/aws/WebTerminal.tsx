"use client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import "@xterm/xterm/css/xterm.css";
import { config } from "@/lib/config";
import { getStorageItem } from "@/lib/local-storage";
import { STORAGE_KEYS } from "@/lib/local-storage-keys";
import { cn } from "@/lib/utils";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface WebTerminalProps {
  workspaceId: string;
  instanceId: string;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotColor: string; textColor: string }
> = {
  connecting: {
    label: "Connecting...",
    dotColor: "bg-amber-500 animate-pulse",
    textColor: "text-amber-500",
  },
  connected: {
    label: "Connected",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-500",
  },
  disconnected: {
    label: "Disconnected",
    dotColor: "bg-red-500",
    textColor: "text-red-500",
  },
};

export function WebTerminal({ workspaceId, instanceId }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    // Initialize terminal
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      lineHeight: 1.4,
      theme: {
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        cursorAccent: "#09090b",
        selectionBackground: "rgba(250, 250, 250, 0.2)",
        black: "#09090b",
        red: "#ff7b72",
        green: "#7ee787",
        yellow: "#ffa657",
        blue: "#79c0ff",
        magenta: "#d2a8ff",
        cyan: "#a5d6ff",
        white: "#fafafa",
        brightBlack: "#484f58",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#a5d6ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#b1bac4",
        brightWhite: "#f0f6fc",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(container);

    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial fit
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors during initialization
      }
    });

    // Connect to Socket.IO
    const token = getStorageItem(STORAGE_KEYS.AUTH_TOKEN);
    // Strip /api suffix to get the base server URL for Socket.IO
    const baseUrl = config.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "");

    const socket = io(`${baseUrl}/aws-terminal`, {
      auth: { token },
      query: { workspaceId, instanceId },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connecting");
    });

    socket.on("connected", () => {
      setStatus("connected");
      terminal.focus();
    });

    socket.on("output", (data: string) => {
      terminal.write(data);
    });

    socket.on("error", (data: { message: string }) => {
      terminal.writeln(`\r\n\x1b[31mError: ${data.message}\x1b[0m\r\n`);
      setStatus("disconnected");
    });

    socket.on("disconnected", () => {
      terminal.writeln("\r\n\x1b[33mSSH session disconnected.\x1b[0m\r\n");
      setStatus("disconnected");
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setStatus("disconnected");
      terminal.writeln(
        "\r\n\x1b[31mFailed to connect to terminal server.\x1b[0m\r\n"
      );
    });

    // Forward terminal input to SSH
    terminal.onData((data) => {
      if (socket.connected) {
        socket.emit("input", data);
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          if (socket.connected) {
            socket.emit("resize", {
              cols: terminal.cols,
              rows: terminal.rows,
            });
          }
        } catch {
          // Ignore resize errors
        }
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      socket.disconnect();
      terminal.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
      socketRef.current = null;
    };
  }, [workspaceId, instanceId]);

  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-b border-border/50">
        <span className={cn("w-2 h-2 rounded-full", statusConfig.dotColor)} />
        <span className={cn("text-xs font-medium", statusConfig.textColor)}>
          {statusConfig.label}
        </span>
      </div>

      {/* Terminal container */}
      <div ref={terminalRef} className="flex-1 bg-[#09090b] px-2 py-1" />
    </div>
  );
}
