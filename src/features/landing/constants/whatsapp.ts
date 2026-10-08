// Numero de WhatsApp de ventas de chaskyapp (solo digitos, con codigo de pais).
// Si no esta configurado, wa.me abre el selector de contacto con el texto
// ya armado - la landing funciona igual mientras se define el numero real.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_CHASKY_WHATSAPP ?? '';

const WHATSAPP_MESSAGE =
  'Hola! Tengo un local y quiero saber cómo funciona chaskyapp.';

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;
