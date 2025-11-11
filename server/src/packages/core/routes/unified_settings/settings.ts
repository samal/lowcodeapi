import express, { Request, Response, Router } from 'express';
import { safePromise, loggerService } from '../../../../utilities';

import Middlewares from '../../middlewares';

import unifiedSettings from '../../services/unified_settings';

interface Session {
    user: {
        id: any,
        [key: string]: any
    };
}

const { isAuthorized } = Middlewares;

const router: Router = express.Router();

router.get('/settings', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session as Session;
  if (!user) {
    return res.status(401).json({
      message: 'Unauthorized request',
      res: null,
    });
  }

  const { ref_id }: { [key: string]: any } = user;
  const { unified_type } : { [key: string]: any } = req.query;
  // const unified_type : string = query.unified_type || '';

  if (!unified_type) {
    return res.status(422).json({
      message: 'unified_type is required.',
    });
  }
  const [unified_error, data] = await safePromise(unifiedSettings
    .get({ user_ref_id: ref_id, unified_type }));

  if (unified_error) {
    loggerService.error(unified_error);
    return res.status(500).json({
      message: 'Error getting settings for unified configuration',
    });
  }

  res.json({
    message: `Unified config for ${unified_type}`,
    res: data || {},
  });
});

router.post('/settings', isAuthorized, async (req: Request, res: Response) => {
  const { user } = req.session;
  if (!user) {
    return res.status(401).json({
      message: 'Unauthorized request',
      res: null,
    });
  }
  const { ref_id }: { [key: string]: any } = user;

  const { unified_type, provider } = req.body;
  if (!unified_type) {
    return res.status(422).json({
      message: 'unified_type is required.',
    });
  }
  const [uerror, updateStatus] = await safePromise(unifiedSettings
    .addOrUpdate({ user_ref_id: ref_id, unified_type, provider }));

  if (uerror) {
    loggerService.error(uerror);
    return res.status(500).json({
      message: `Error updating unified configuration for ${unified_type}`,
    });
  }

  res.json({
    message: `Added or Updated for ${unified_type}`,
    res: updateStatus,
  });
});

export default router;
