import { db } from '../models/db.js';
import { ClientTenant, SoftwareLicenseSale } from '../types/index.js';
import { AppError } from '../middlewares/error.middleware.js';

export class ClientTenantService {
  public static getAllClients(filters?: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let clients = db.get('clients');

    if (filters?.status && filters.status !== 'all') {
      clients = clients.filter((c) => c.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      clients = clients.filter(
        (c) =>
          c.businessName.toLowerCase().includes(q) ||
          c.ownerName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }

    if (filters?.startDate) {
      clients = clients.filter((c) => c.startDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      clients = clients.filter((c) => c.startDate <= filters.endDate!);
    }

    return clients;
  }

  public static getClientById(id: string) {
    const client = db.get('clients').find((c) => c.id === id);
    if (!client) {
      throw new AppError(`Client tenant with ID '${id}' not found.`, 404);
    }
    return client;
  }

  public static createClient(data: Omit<ClientTenant, 'id' | 'createdAt' | 'updatedAt'>) {
    const clients = db.get('clients');
    const newId = (data as any).id || `CLI-${clients.length + 1001}`;

    const newClient: ClientTenant = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clients.unshift(newClient);
    db.set('clients', clients);

    // Sync or create Owner User in 'users' so the store owner can log in
    const users = db.get('users');
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === newClient.email.toLowerCase() || (u.tenantId === newId && u.role === 'owner')
    );

    const isPending = newClient.status === 'pending';
    const isActive = newClient.status === 'active';

    if (!existingUser) {
      users.push({
        id: `user-${Date.now().toString().slice(-6)}`,
        name: newClient.ownerName,
        email: newClient.email.toLowerCase(),
        phone: newClient.phone,
        passwordHash: '$2a$10$iI0qQv/s6R2z4zZ11u0qmeK3dZ0l1sQ9H8hJ8Iq9/4fG8l1bU3Vce', // default hash for Venixa@123
        role: 'owner',
        tenantId: newId,
        designation: 'Store Owner',
        isActive: isActive,
        status: isPending ? 'pending_approval' : isActive ? 'active' : 'inactive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      db.set('users', users);
    }

    return newClient;
  }

  public static updateClient(id: string, updates: Partial<ClientTenant>) {
    const clients = db.get('clients');
    const index = clients.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new AppError(`Client tenant with ID '${id}' not found.`, 404);
    }

    const updated = {
      ...clients[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    clients[index] = updated;
    db.set('clients', clients);
    return updated;
  }

  public static approveClient(id: string) {
    const client = this.getClientById(id);
    const updated = this.updateClient(id, {
      status: 'active',
      credentials: {
        ...(client.credentials || {
          username: client.email.split('@')[0],
          tenantCode: client.id,
          loginUrl: 'http://localhost:5173/login',
        }),
        status: 'provisioned',
      },
    });

    // Activate owner user
    const users = db.get('users');
    let user = users.find((u) => u.tenantId === id && u.role === 'owner');
    if (!user) {
      user = users.find((u) => u.email.toLowerCase() === client.email.toLowerCase());
    }

    if (user) {
      user.isActive = true;
      user.status = 'active';
      user.updatedAt = new Date().toISOString();
      db.set('users', users);
    } else {
      // Create user if missing
      users.push({
        id: `user-${Date.now().toString().slice(-6)}`,
        name: client.ownerName,
        email: client.email.toLowerCase(),
        phone: client.phone,
        passwordHash: '$2a$10$iI0qQv/s6R2z4zZ11u0qmeK3dZ0l1sQ9H8hJ8Iq9/4fG8l1bU3Vce',
        role: 'owner',
        tenantId: client.id,
        designation: 'Store Owner',
        isActive: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      db.set('users', users);
    }

    return updated;
  }

  public static activateClient(id: string) {
    const updated = this.updateClient(id, { status: 'active' });
    const users = db.get('users');
    const user = users.find((u) => u.tenantId === id && u.role === 'owner');
    if (user) {
      user.isActive = true;
      user.status = 'active';
      user.updatedAt = new Date().toISOString();
      db.set('users', users);
    }
    return updated;
  }

  public static deactivateClient(id: string) {
    const updated = this.updateClient(id, { status: 'suspended' });
    const users = db.get('users');
    const user = users.find((u) => u.tenantId === id && u.role === 'owner');
    if (user) {
      user.isActive = false;
      user.status = 'inactive';
      user.updatedAt = new Date().toISOString();
      db.set('users', users);
    }
    return updated;
  }

  public static blockClient(id: string) {
    const updated = this.updateClient(id, { status: 'blocked' });
    const users = db.get('users');
    const user = users.find((u) => u.tenantId === id && u.role === 'owner');
    if (user) {
      user.isActive = false;
      user.status = 'blocked';
      user.updatedAt = new Date().toISOString();
      db.set('users', users);
    }
    return updated;
  }

  public static deleteClient(id: string) {
    const clients = db.get('clients');
    const filtered = clients.filter((c) => c.id !== id);
    if (filtered.length === clients.length) {
      throw new AppError(`Client tenant with ID '${id}' not found.`, 404);
    }
    db.set('clients', filtered);

    // Clean up associated users
    const users = db.get('users');
    const filteredUsers = users.filter((u) => u.tenantId !== id);
    db.set('users', filteredUsers);

    return { success: true, message: `Client ${id} deleted successfully.` };
  }

  public static toggleClientStatus(id: string) {
    const client = this.getClientById(id);
    const nextStatus = client.status === 'active' ? 'suspended' : 'active';
    if (nextStatus === 'active') {
      return this.activateClient(id);
    } else {
      return this.deactivateClient(id);
    }
  }

  public static regenerateCredentials(id: string) {
    const client = this.getClientById(id);
    const pin = Math.floor(1000 + Math.random() * 9000);
    const newPassword = `Vnx#${pin}@${new Date().getFullYear()}`;

    const updatedCredentials = {
      ...client.credentials,
      temporaryPassword: newPassword,
      passwordLastReset: new Date().toISOString().split('T')[0],
      status: 'provisioned' as const,
    };

    this.updateClient(id, { credentials: updatedCredentials });
    return { temporaryPassword: newPassword, credentials: updatedCredentials };
  }

  public static getPlatformMetrics() {
    const clients = db.get('clients');
    const sales = db.get('licenseSales');

    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.status === 'active').length;
    const trialClients = clients.filter((c) => c.status === 'trial').length;
    const suspendedClients = clients.filter((c) => c.status === 'suspended').length;

    const totalMRR = clients
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

    const totalLicenseSalesRevenue = sales
      .filter((s) => s.status === 'paid')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      totalClients,
      clientsCount: totalClients,
      activeClients,
      trialClients,
      suspendedClients,
      totalMRR,
      totalLicenseSalesRevenue,
      recentClients: clients.slice(0, 5),
    };
  }
}
