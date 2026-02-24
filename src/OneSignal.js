import OneSignal from 'react-onesignal';

export default async function runOneSignal() {


  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) return; // [AUDIT FIX] Skip si no hay key

  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      language: 'es',
      notifyButton: {
        enable: true,
        text: {
          'tip.state.unsubscribed': 'Activar alertas BCV',
          'tip.state.subscribed': 'Alertas BCV activas',
          'tip.state.blocked': 'Notificaciones bloqueadas',
          'message.prenotify': 'Toca para recibir alertas del BCV',
          'message.action.subscribed': '¡Listo! Te avisaremos cuando cambie el BCV.',
          'message.action.resubscribed': 'Alertas BCV activadas',
          'message.action.unsubscribed': 'Alertas desactivadas',
          'dialog.main.title': 'Alertas BCV',
          'dialog.main.button.subscribe': 'ACTIVAR',
          'dialog.main.button.unsubscribe': 'DESACTIVAR',
          'dialog.blocked.title': 'Desbloquear Alertas',
          'dialog.blocked.message': 'Sigue las instrucciones para permitir las alertas del BCV:'
        }
      },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' }
    });
  } catch (err) {
    // Silencioso en localhost, error en producción
    if (!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.error("Error al iniciar OneSignal", err);
    }
  }
}