import { Router } from 'express';
import * as controller from '../controllers/customer.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { listQuery, uuidParam } from '../validators/common.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator.js';

export const customerRoutes = Router();

customerRoutes.get('/', validate(listQuery, 'query'), asyncHandler(controller.index));
customerRoutes.get('/:id', validate(uuidParam, 'params'), asyncHandler(controller.show));
customerRoutes.post('/', validate(createCustomerSchema), asyncHandler(controller.store));
customerRoutes.put(
  '/:id',
  validate(uuidParam, 'params'),
  validate(updateCustomerSchema),
  asyncHandler(controller.update),
);
customerRoutes.delete('/:id', validate(uuidParam, 'params'), asyncHandler(controller.destroy));
