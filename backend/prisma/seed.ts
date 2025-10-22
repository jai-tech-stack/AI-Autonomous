import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AI_CEO_TEMPLATES = [
  {
    templateId: 'generic_strategic',
    name: 'Strategic CEO',
    personality: { tone: 'professional', focus: 'long-term strategy' },
    goals: { growth: 'sustainable', risk: 'moderate' },
  },
  {
    templateId: 'finance_cfo',
    name: 'Finance CFO',
    personality: { tone: 'analytical', focus: 'financial metrics' },
    goals: { runwayMonths: 18, marginTarget: 0.65 },
  },
];

async function main() {
  console.log('Seeding baseline data...');

  // Seed a demo organization and owner user for local testing
  const demoUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      password: 'hashed-password',
      firstName: 'Demo',
      lastName: 'Owner',
    },
  });

  const demoOrg = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Demo Org', plan: 'free' },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: demoUser.id, organizationId: demoOrg.id } },
    update: { role: 'owner' },
    create: { userId: demoUser.id, organizationId: demoOrg.id, role: 'owner' },
  });

  // Seed AI CEO templates as stored configs per org (example approach)
  for (const tpl of AI_CEO_TEMPLATES) {
    await prisma.aiCeoConfig.upsert({
      where: { organizationId: demoOrg.id },
      update: { templateId: tpl.templateId, ceoName: tpl.name, personality: tpl.personality, goals: tpl.goals },
      create: {
        organizationId: demoOrg.id,
        templateId: tpl.templateId,
        ceoName: tpl.name,
        personality: tpl.personality as any,
        goals: tpl.goals as any,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


