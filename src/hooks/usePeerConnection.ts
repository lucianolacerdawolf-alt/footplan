import { useState, useRef, useCallback, useEffect } from 'react';
import { Peer, type DataConnection, type PeerOptions } from 'peerjs';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

// Sem VITE_PEER_HOST, usa o broker público da PeerJS (0.peerjs.com) — sem SLA,
// pode throttlar sob tráfego. Pra produção de verdade, suba um PeerServer próprio
// (ver GUIA_PRODUCAO.md) e configure VITE_PEER_HOST/PORT/PATH/SECURE no .env do build.
function peerServerOptions(): PeerOptions | undefined {
  const host = import.meta.env.VITE_PEER_HOST as string | undefined;
  if (!host) return undefined;
  return {
    host,
    port: Number(import.meta.env.VITE_PEER_PORT ?? 443),
    path: (import.meta.env.VITE_PEER_PATH as string | undefined) ?? '/',
    secure: ((import.meta.env.VITE_PEER_SECURE as string | undefined) ?? 'true') === 'true',
  };
}

/** Traduz tipos de erro do PeerJS (err.type) pra mensagens acionáveis em PT.
 *  Sem isso, o usuário via "Erro: peer-unavailable" — técnico e em inglês, não
 *  explicava que a sala não existia. */
function friendlyPeerError(err: { type?: string; message?: string }): string {
  switch (err.type) {
    case 'peer-unavailable':
      return 'Sala não encontrada. Verifique o código e tente novamente.';
    case 'network':
    case 'server-error':
      return 'Erro de rede. Verifique sua conexão e tente novamente.';
    case 'unavailable-id':
    case 'id-taken':
      return 'Esse código de sala já está em uso. Tente criar novamente.';
    case 'browser-incompatible':
      return 'Seu navegador não suporta conexão P2P.';
    case 'disconnected':
      return 'Desconectado do servidor de pareamento. Tente novamente.';
    case 'ssl-unavailable':
      return 'Conexão segura indisponível. Tente novamente.';
    case 'socket-error':
      return 'Erro de comunicação com o servidor. Tente novamente.';
    case 'socket-closed':
      return 'Conexão com o servidor encerrada. Tente novamente.';
    default:
      return `Erro: ${err.message || err.type || 'Não foi possível conectar'}`;
  }
}

export interface UsePeerConnectionReturn {
  state: ConnectionState;
  roomId: string | null;
  error: string | null;
  isHost: boolean;
  peerConnected: boolean;
  createRoom: () => void;
  joinRoom: (hostId: string) => void;
  send: (data: unknown) => void;
  setOnData: (handler: ((data: unknown) => void) | null) => void;
  disconnect: () => void;
}

export function usePeerConnection(): UsePeerConnectionReturn {
  const [state, setState] = useState<ConnectionState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const onDataRef = useRef<((data: unknown) => void) | null>(null);
  const timeoutRef = useRef<number>(0);
  const mountedRef = useRef(true);
  // O timeout chama cleanup() (peer.destroy()), que no PeerJS emite `close` SÍNCRONO
  // no mesmo tick — sem este flag, o handler de `close` sobrescrevia o estado 'error'
  // do timeout com 'idle' (o React 18+ batcheia os dois setState num render só).
  const timeoutFiredRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = 0; }
    if (connRef.current) {
      try { connRef.current.close(); } catch { /* noop */ }
      connRef.current = null;
    }
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch { /* noop */ }
      peerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  const createRoom = useCallback(() => {
    cleanup();
    timeoutFiredRef.current = false;
    setError(null);
    setState('connecting');
    setIsHost(true);
    timeoutRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      timeoutFiredRef.current = true;
      setState('error');
      setError('Tempo limite de conexão — tente novamente');
      cleanup();
    }, 15000);

    const code = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    const peerId = `fp-${code}`;

    const opts = peerServerOptions();
    const peer = opts ? new Peer(peerId, opts) : new Peer(peerId);
    peerRef.current = peer;

    peer.on('open', () => {
      if (!mountedRef.current) { peer.destroy(); return; }
      if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = 0; }
      setRoomId(code);
      setState('connected');
    });

    peer.on('connection', (conn) => {
      if (connRef.current) { conn.close(); return; }
      connRef.current = conn;

      conn.on('open', () => {
        if (!mountedRef.current) return;
        setPeerConnected(true);
      });

      conn.on('data', (data: unknown) => {
        if (!mountedRef.current) return;
        onDataRef.current?.(data);
      });

      conn.on('close', () => {
        if (!mountedRef.current) return;
        connRef.current = null;
        setPeerConnected(false);
        setState('error');
        setError('Conexão fechada pelo outro jogador');
      });

      conn.on('error', (err) => {
        if (!mountedRef.current) return;
        setState('error');
        setError(friendlyPeerError(err as { type?: string; message?: string }));
      });
    });

    peer.on('disconnected', () => {
      if (!mountedRef.current) return;
      setState('error');
      setError('Desconectado do servidor');
    });

    peer.on('error', (err) => {
      if (!mountedRef.current) return;
      setState('error');
      setError(friendlyPeerError(err as { type?: string; message?: string }));
    });

    peer.on('close', () => {
      if (!mountedRef.current) return;
      // Ignora o `close` síncrono disparado pelo destroy() do timeout — o estado
      // 'error' já foi definido e não pode ser sobrescrito por 'idle'.
      if (timeoutFiredRef.current) return;
      setState('idle');
      setRoomId(null);
    });
  }, [cleanup]);

  const joinRoom = useCallback((hostId: string) => {
    cleanup();
    timeoutFiredRef.current = false;
    setError(null);
    setState('connecting');
    setIsHost(false);
    timeoutRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      timeoutFiredRef.current = true;
      setState('error');
      setError('Tempo limite de conexão — tente novamente');
      cleanup();
    }, 15000);

    const peerId = hostId.includes('-') ? hostId : `fp-${hostId.toUpperCase()}`;

    const opts = peerServerOptions();
    const peer = opts ? new Peer(opts) : new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      if (!mountedRef.current) { peer.destroy(); return; }
      if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = 0; }
      const conn = peer.connect(peerId, { reliable: true });
      connRef.current = conn;

      conn.on('open', () => {
        if (!mountedRef.current) { conn.close(); peer.destroy(); return; }
        setState('connected');
        setPeerConnected(true);
      });

      conn.on('data', (data: unknown) => {
        if (!mountedRef.current) return;
        onDataRef.current?.(data);
      });

      conn.on('close', () => {
        if (!mountedRef.current) return;
        connRef.current = null;
        setPeerConnected(false);
        setState('error');
        setError('Conexão fechada pelo host');
      });

      conn.on('error', (err) => {
        if (!mountedRef.current) return;
        setState('error');
        setError(friendlyPeerError(err as { type?: string; message?: string }));
      });
    });

    peer.on('error', (err) => {
      if (!mountedRef.current) return;
      setState('error');
      setError(friendlyPeerError(err as { type?: string; message?: string }));
    });
  }, [cleanup]);

  const send = useCallback((data: unknown) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send(data);
    }
  }, []);

  const setOnData = useCallback((handler: ((data: unknown) => void) | null) => {
    onDataRef.current = handler;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    timeoutFiredRef.current = false;
    setState('idle');
    setRoomId(null);
    setError(null);
    setIsHost(false);
    setPeerConnected(false);
  }, [cleanup]);

  return { state, roomId, error, isHost, peerConnected, createRoom, joinRoom, send, setOnData, disconnect };
}
