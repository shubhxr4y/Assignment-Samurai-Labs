import { Router } from 'express';
import * as controller from '../controllers/item.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { listQuery, uuidParam } from '../validators/common.js';
import { createItemSchema, updateItemSchema } from '../validators/item.validator.js';

export const itemRoutes = Router();

itemRoutes.get('/', validate(listQuery, 'query'), asyncHandler(controller.index));
itemRoutes.get('/:id', validate(uuidParam, 'params'), asyncHandler(controller.show));
itemRoutes.get('/:id/invoices', validate(uuidParam, 'params'), asyncHandler(controller.invoices));
itemRoutes.post('/', validate(createItemSchema), asyncHandler(controller.store));
itemRoutes.put(
  '/:id',
  validate(uuidParam, 'params'),
  validate(updateItemSchema),
  asyncHandler(controller.update),
);
itemRoutes.delete('/:id', validate(uuidParam, 'params'), asyncHandler(controller.destroy));
