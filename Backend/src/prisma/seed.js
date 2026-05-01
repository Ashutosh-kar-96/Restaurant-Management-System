require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password
  const password = await bcrypt.hash('password123', 12);

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@rms.com' },
    update: {},
    create: { email: 'superadmin@rms.com', password, firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', isVerified: true },
  });

  // Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'spice-garden-main' },
    update: {},
    create: { name: 'Spice Garden', slug: 'spice-garden-main', email: 'info@spicegarden.com', phone: '9876543210', gstin: '29ABCDE1234F1Z5', city: 'Bengaluru', description: 'Authentic Indian cuisine', isActive: true },
  });

  // Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main-001' },
    update: {},
    create: { id: 'branch-main-001', restaurantId: restaurant.id, name: 'Main Branch', address: '123 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '9876543211', openTime: '09:00', closeTime: '23:00' },
  });

  // Staff users
  const roles = [
    { email: 'admin@rms.com',   firstName: 'Admin',   lastName: 'User',    role: 'RESTAURANT_ADMIN' },
    { email: 'manager@rms.com', firstName: 'Manager', lastName: 'User',    role: 'MANAGER' },
    { email: 'waiter@rms.com',  firstName: 'Ravi',    lastName: 'Kumar',   role: 'WAITER' },
    { email: 'chef@rms.com',    firstName: 'Priya',   lastName: 'Sharma',  role: 'CHEF' },
    { email: 'cashier@rms.com', firstName: 'Arjun',   lastName: 'Mehta',   role: 'CASHIER' },
  ];

  for (const r of roles) {
    const user = await prisma.user.upsert({
      where: { email: r.email }, update: {},
      create: { email: r.email, password, firstName: r.firstName, lastName: r.lastName, role: r.role, isVerified: true },
    });
    await prisma.restaurantStaff.upsert({
      where: { userId_restaurantId: { userId: user.id, restaurantId: restaurant.id } }, update: {},
      create: { userId: user.id, restaurantId: restaurant.id, branchId: branch.id, role: r.role },
    });
  }

  // Menu Categories
  const categories = ['Starters', 'Main Course', 'Breads', 'Beverages', 'Desserts'];
  const createdCats = [];
  for (const name of categories) {
    const cat = await prisma.menuCategory.create({ data: { restaurantId: restaurant.id, name } });
    createdCats.push(cat);
  }

  // Menu Items
  const items = [
    { name: 'Paneer Tikka',      categoryIndex: 0, price: 220, isVeg: true,  prepTime: 15 },
    { name: 'Chicken 65',        categoryIndex: 0, price: 280, isVeg: false, prepTime: 20 },
    { name: 'Veg Samosa (2pcs)', categoryIndex: 0, price: 80,  isVeg: true,  prepTime: 10 },
    { name: 'Butter Chicken',    categoryIndex: 1, price: 320, isVeg: false, prepTime: 25 },
    { name: 'Dal Makhani',       categoryIndex: 1, price: 200, isVeg: true,  prepTime: 20 },
    { name: 'Paneer Butter Masala', categoryIndex: 1, price: 260, isVeg: true, prepTime: 20 },
    { name: 'Biryani (Veg)',     categoryIndex: 1, price: 220, isVeg: true,  prepTime: 30 },
    { name: 'Butter Naan',       categoryIndex: 2, price: 50,  isVeg: true,  prepTime: 8  },
    { name: 'Tandoori Roti',     categoryIndex: 2, price: 35,  isVeg: true,  prepTime: 5  },
    { name: 'Masala Chai',       categoryIndex: 3, price: 40,  isVeg: true,  prepTime: 5  },
    { name: 'Fresh Lime Soda',   categoryIndex: 3, price: 60,  isVeg: true,  prepTime: 5  },
    { name: 'Gulab Jamun',       categoryIndex: 4, price: 80,  isVeg: true,  prepTime: 5  },
  ];

  for (const item of items) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id, categoryId: createdCats[item.categoryIndex].id,
        name: item.name, basePrice: item.price, isVeg: item.isVeg,
        preparationTime: item.prepTime, taxRate: 5, isAvailable: true,
        variants: item.name.includes('Tikka') || item.name.includes('Chicken 65') ? {
          create: [{ variant: 'HALF', price: item.price * 0.6 }, { variant: 'FULL', price: item.price }]
        } : undefined,
      },
    });
  }

  // Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({ data: { branchId: branch.id, number: `T${i}`, capacity: i <= 6 ? 4 : 6, floor: i <= 5 ? 1 : 2, status: 'AVAILABLE' } });
  }

  // Inventory / Suppliers
  const supplier = await prisma.supplier.create({ data: { name: 'Fresh Farms', phone: '9000000001', email: 'supply@freshfarms.com' } });
  const inventoryItems = [
    { name: 'Tomatoes',       unit: 'kg',  current: 25,  min: 5,  max: 50,  cost: 40 },
    { name: 'Paneer',         unit: 'kg',  current: 8,   min: 3,  max: 20,  cost: 280 },
    { name: 'Chicken',        unit: 'kg',  current: 15,  min: 5,  max: 40,  cost: 180 },
    { name: 'Basmati Rice',   unit: 'kg',  current: 40,  min: 10, max: 100, cost: 90 },
    { name: 'Cooking Oil',    unit: 'l',   current: 12,  min: 5,  max: 30,  cost: 130 },
    { name: 'Onions',         unit: 'kg',  current: 2,   min: 5,  max: 30,  cost: 25  },
    { name: 'Milk',           unit: 'l',   current: 10,  min: 5,  max: 25,  cost: 55 },
  ];

  for (const inv of inventoryItems) {
    const alertLevel = inv.current <= 0 ? 'OUT_OF_STOCK' : inv.current <= inv.min * 0.5 ? 'CRITICAL' : inv.current <= inv.min ? 'LOW' : 'NORMAL';
    await prisma.inventory.create({ data: { branchId: branch.id, supplierId: supplier.id, name: inv.name, unit: inv.unit, currentStock: inv.current, minStockLevel: inv.min, maxStockLevel: inv.max, costPerUnit: inv.cost, alertLevel } });
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Super Admin  → superadmin@rms.com / password123');
  console.log('  Admin        → admin@rms.com      / password123');
  console.log('  Manager      → manager@rms.com    / password123');
  console.log('  Waiter       → waiter@rms.com     / password123');
  console.log('  Chef         → chef@rms.com       / password123');
  console.log('  Cashier      → cashier@rms.com    / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
