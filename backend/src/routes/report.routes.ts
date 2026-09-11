import { Router } from 'express';
import * as controller from '../controllers/report.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', asyncHandler(controller.dashboard));

export const reportRoutes = Router();
reportRoutes.get('/customer-sales', asyncHandler(controller.customerSales));
reportRoutes.get('/item-sales', asyncHandler(controller.itemSales));
reportRoutes.get('/pending-payments', asyncHandler(controller.pendingPayments));
