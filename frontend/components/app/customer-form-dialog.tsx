'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequestError } from '@/lib/api';
import { createCustomer, updateCustomer } from '@/services/customers';
import { revalidate } from '@/hooks/use-api';
import type { Customer } from '@/types/api';

/**
 * Mirrors the server's rules so the user gets an answer before the round trip.
 * The server still validates — this is a convenience, not the guard.
 */
const schema = z.object({
  name: z.string().trim().min(1, 'Please enter the customer’s name.').max(200),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Please enter a valid email address, for example name@business.com.',
    }),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[\d+][\d\s\-()]{6,19}$/.test(v), {
      message: 'Please enter a valid phone number, for example 98765 43210.',
    }),
  address: z.string().trim().max(400),
  gstin: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[0-9A-Za-z]{15}$/.test(v), {
      message: 'A GSTIN is 15 characters, for example 27AAPFU0939F1ZV.',
    }),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  gstin: '',
  status: 'active',
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}) {
  const editing = Boolean(customer);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      customer
        ? {
            name: customer.name,
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            address: customer.address ?? '',
            gstin: customer.gstin ?? '',
            status: customer.status,
          }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
      gstin: values.gstin || null,
      status: values.status,
    };

    try {
      const saved = customer
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);
      revalidate('/customers', '/dashboard', '/reports');
      toast.success(editing ? 'Customer updated' : 'Customer added', {
        description: saved.name,
      });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.fields) {
          for (const [field, message] of Object.entries(error.fields)) {
            if (field in emptyValues) {
              form.setError(field as keyof FormValues, { message });
            }
          }
        }
        toast.error(error.message);
      } else {
        toast.error('The customer could not be saved. Please try again.');
      }
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader
          title={editing ? 'Edit customer' : 'Add a customer'}
          description={
            editing
              ? 'Changes apply everywhere this customer appears. Past invoices keep the details they were raised with.'
              : 'You only need a name to get started — the rest can be filled in later.'
          }
        />
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Business or customer name"
              htmlFor="customer-name"
              error={errors.name?.message}
              className="sm:col-span-2"
            >
              <Input
                id="customer-name"
                autoFocus
                placeholder="Sharma Traders"
                invalid={Boolean(errors.name)}
                {...form.register('name')}
              />
            </Field>

            <Field label="Email" htmlFor="customer-email" optional error={errors.email?.message}>
              <Input
                id="customer-email"
                type="email"
                placeholder="accounts@sharmatraders.in"
                invalid={Boolean(errors.email)}
                {...form.register('email')}
              />
            </Field>

            <Field label="Phone" htmlFor="customer-phone" optional error={errors.phone?.message}>
              <Input
                id="customer-phone"
                type="tel"
                placeholder="+91 98300 41125"
                invalid={Boolean(errors.phone)}
                {...form.register('phone')}
              />
            </Field>

            <Field
              label="Address"
              htmlFor="customer-address"
              optional
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <Textarea
                id="customer-address"
                rows={3}
                placeholder="14/2 Burrabazar, Kolkata, West Bengal 700007"
                invalid={Boolean(errors.address)}
                {...form.register('address')}
              />
            </Field>

            <Field
              label="GSTIN"
              htmlFor="customer-gstin"
              optional
              error={errors.gstin?.message}
              hint="Printed on the invoice when present."
            >
              <Input
                id="customer-gstin"
                placeholder="19AABCS1429B1Z8"
                className="uppercase"
                invalid={Boolean(errors.gstin)}
                {...form.register('gstin')}
              />
            </Field>

            <Field
              label="Status"
              error={errors.status?.message}
              hint="Inactive customers stay in your books but cannot be billed."
            >
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Add customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
