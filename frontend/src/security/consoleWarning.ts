export const injectSelfXSSWarning = (): void => {
  if (!import.meta.env.PROD) {
    return;
  }

  const stopStyles = 'color: red; font-family: sans-serif; font-size: 4.5em; font-weight: 900; text-shadow: 2px 2px 0 #000; letter-spacing: 0.05em;';
  const bodyStyles = 'color: #333; font-family: sans-serif; font-size: 1.4em; line-height: 1.6; font-weight: 500;';
  const brandStyles = 'color: #2563eb; font-family: sans-serif; font-size: 1.2em; font-weight: 700;';

  console.log('%cSTOP!', stopStyles);

  console.log(
    '%c⚠️ SECURITY WARNING:%c Anyone who tells you to paste code here is trying to steal your account. Pasting code into this console gives them full access to your session, authentication tokens, and personal data.',
    bodyStyles,
    'font-family: sans-serif; font-size: 1.4em; line-height: 1.6; font-weight: bold; color: #dc2626;'
  );

  console.log(
    '%c🛡️ Soma Study Partner will NEVER ask you to paste code here, enable any feature this way, or run any commands in your browser console. If anyone asks you to do this, they are attempting to hack your account.',
    brandStyles
  );
};
