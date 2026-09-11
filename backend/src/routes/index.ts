import { Router } from 'express';
import { customerRoutes } from './customer.routes.js';
import { itemRoutes } from './item.routes.js';
import { invoiceRoutes } from './invoice.routes.js';
import { dashboardRoutes, reportRoutes } from './report.routes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

apiRoutes.use('/customers', customerRoutes);
apiRoutes.use('/items', itemRoutes);
apiRoutes.use('/invoices', invoiceRoutes);
apiRoutes.use('/dashboard', dashboardRoutes);
apiRoutes.use('/reports', reportRoutes);
