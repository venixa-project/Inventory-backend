import { CustomerService } from '../services/customer.service.js';
export class CustomerController {
    static getAll(req, res, next) {
        try {
            const { search, status } = req.query;
            const customers = CustomerService.getCustomers(req.tenantId, { search, status });
            res.json({ success: true, count: customers.length, data: customers });
        }
        catch (err) {
            next(err);
        }
    }
    static getById(req, res, next) {
        try {
            const id = req.params.id;
            const customer = CustomerService.getCustomerById(req.tenantId, id);
            res.json({ success: true, data: customer });
        }
        catch (err) {
            next(err);
        }
    }
    static getLedger(req, res, next) {
        try {
            const id = req.params.id;
            const ledger = CustomerService.getCustomerLedger(req.tenantId, id);
            res.json({ success: true, data: ledger });
        }
        catch (err) {
            next(err);
        }
    }
    static create(req, res, next) {
        try {
            const customer = CustomerService.createCustomer(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
        }
        catch (err) {
            next(err);
        }
    }
    static update(req, res, next) {
        try {
            const id = req.params.id;
            const updated = CustomerService.updateCustomer(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Customer updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static recordPayment(req, res, next) {
        try {
            const id = req.params.id;
            const { amount, paymentMode, notes } = req.body;
            const updated = CustomerService.recordPayment(req.tenantId, id, Number(amount), paymentMode, notes);
            res.json({ success: true, message: 'Payment recorded and due balance updated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static delete(req, res, next) {
        try {
            const id = req.params.id;
            const result = CustomerService.deleteCustomer(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
