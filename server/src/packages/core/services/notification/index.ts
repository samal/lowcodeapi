import axios from 'axios';
import { loggerService, safePromise } from '../../../../utilities';

export default {
  send: async (payload : any, options: any = { url: null, headers: {}, method: 'POST' }) => {
    if (!options.url) return;
    const config = {
      url: options.url,
      method: options.method,
      data: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    };
    const [emailError, jsonResp] = await safePromise(
      axios(config),
    );

    if (emailError) {
      loggerService.error('Sending Error', payload, emailError);
      return { success: false };
    }
    loggerService.info('Sent', jsonResp.data);
    return {
      success: true,
    };
  },
};
