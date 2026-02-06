import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index.js";
import { user, account } from "./schema/auth.js";
import {
  departments,
  subjects,
  classes,
  enrollments,
} from "./schema/app.js";

const SUPER_ADMIN = {
  name: "Georgi",
  email: "georgig@test.com",
  password: "Stormrage1041",
};

const DEFAULT_PASSWORD = "Password123!";

function randomInviteCode(): string {
  return Math.random().toString(36).substring(2, 10);
}

async function seed() {
  console.log("Seeding database...");

  // 1. Super admin (user + credential account)
  const adminId = randomUUID();
  const adminPasswordHash = await hashPassword(SUPER_ADMIN.password);
  await db.insert(user).values({
    id: adminId,
    name: SUPER_ADMIN.name,
    email: SUPER_ADMIN.email,
    emailVerified: true,
    role: "admin",
  });
  await db.insert(account).values({
    id: randomUUID(),
    userId: adminId,
    providerId: "credential",
    accountId: adminId,
    password: adminPasswordHash,
  });
  console.log("  Super admin created:", SUPER_ADMIN.email);

  // 2. Departments
  const [deptCs, deptMath, deptEng] = await db
    .insert(departments)
    .values([
      { code: "CS", name: "Computer Science", description: "CS department" },
      { code: "MATH", name: "Mathematics", description: "Math department" },
      { code: "ENG", name: "Engineering", description: "Engineering department" },
    ])
    .returning({ id: departments.id });

  const deptIds = {
    cs: deptCs!.id,
    math: deptMath!.id,
    eng: deptEng!.id,
  };
  console.log("  Departments created: 3");

  // 3. Faculty (teachers) and students with credential accounts
  const teacherPasswordHash = await hashPassword(DEFAULT_PASSWORD);
  const studentPasswordHash = await hashPassword(DEFAULT_PASSWORD);

  const teacherIds: string[] = [];
  for (const t of [
    { name: "Alice Smith", email: "alice.smith@test.com" },
    { name: "Bob Jones", email: "bob.jones@test.com" },
    { name: "Carol White", email: "carol.white@test.com" },
  ]) {
    const id = randomUUID();
    await db.insert(user).values({
      id,
      name: t.name,
      email: t.email,
      emailVerified: true,
      role: "teacher",
    });
    await db.insert(account).values({
      id: randomUUID(),
      userId: id,
      providerId: "credential",
      accountId: id,
      password: teacherPasswordHash,
    });
    teacherIds.push(id);
  }

  const studentIds: string[] = [];
  for (const s of [
    { name: "David Lee", email: "david.lee@test.com" },
    { name: "Eva Brown", email: "eva.brown@test.com" },
    { name: "Frank Green", email: "frank.green@test.com" },
    { name: "Grace Hall", email: "grace.hall@test.com" },
    { name: "Henry King", email: "henry.king@test.com" },
  ]) {
    const id = randomUUID();
    await db.insert(user).values({
      id,
      name: s.name,
      email: s.email,
      emailVerified: true,
      role: "student",
    });
    await db.insert(account).values({
      id: randomUUID(),
      userId: id,
      providerId: "credential",
      accountId: id,
      password: studentPasswordHash,
    });
    studentIds.push(id);
  }
  console.log("  Faculty (teachers): 3, Students: 5");

  // 4. Subjects
  const [subj1, subj2, subj3, subj4] = await db
    .insert(subjects)
    .values([
      { departmentId: deptIds.cs, code: "CS101", name: "Intro to Programming" },
      { departmentId: deptIds.cs, code: "CS201", name: "Data Structures" },
      { departmentId: deptIds.math, code: "MATH101", name: "Calculus I" },
      { departmentId: deptIds.eng, code: "ENG101", name: "Intro to Engineering" },
    ])
    .returning({ id: subjects.id });

  const subjectIds = [subj1!.id, subj2!.id, subj3!.id, subj4!.id];
  console.log("  Subjects created: 4");

  // 5. Classes (each with a teacher and schedules)
  const defaultSchedules = [
    { day: "Monday", startTime: "09:00", endTime: "10:30" },
    { day: "Wednesday", startTime: "09:00", endTime: "10:30" },
  ];

  const classRows = await db
    .insert(classes)
    .values([
      {
        subjectId: subjectIds[0],
        teacherId: teacherIds[0],
        inviteCode: randomInviteCode(),
        name: "CS101 Fall Section A",
        capacity: 50,
        schedules: defaultSchedules,
      },
      {
        subjectId: subjectIds[0],
        teacherId: teacherIds[1],
        inviteCode: randomInviteCode(),
        name: "CS101 Fall Section B",
        capacity: 45,
        schedules: defaultSchedules,
      },
      {
        subjectId: subjectIds[1],
        teacherId: teacherIds[0],
        inviteCode: randomInviteCode(),
        name: "CS201 Fall Section A",
        capacity: 40,
        schedules: defaultSchedules,
      },
      {
        subjectId: subjectIds[2],
        teacherId: teacherIds[2],
        inviteCode: randomInviteCode(),
        name: "Calculus I Fall",
        capacity: 60,
        schedules: defaultSchedules,
      },
      {
        subjectId: subjectIds[3],
        teacherId: teacherIds[2],
        inviteCode: randomInviteCode(),
        name: "Intro to Engineering Fall",
        capacity: 55,
        schedules: defaultSchedules,
      },
    ])
    .returning({ id: classes.id });

  const classIds = classRows.map((r) => r!.id);
  console.log("  Classes created: 5");

  // 6. Enrollments (spread students across classes)
  const enrollPairs: { studentId: string; classId: number }[] = [];
  for (let i = 0; i < studentIds.length; i++) {
    // Each student in at least 2 classes
    enrollPairs.push({ studentId: studentIds[i], classId: classIds[i % classIds.length] });
    enrollPairs.push({ studentId: studentIds[i], classId: classIds[(i + 1) % classIds.length] });
  }
  // Dedupe (student can only be in a class once)
  const seen = new Set<string>();
  const unique = enrollPairs.filter(({ studentId, classId }) => {
    const key = `${studentId}-${classId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await db.insert(enrollments).values(unique);
  console.log("  Enrollments created:", unique.length);

  console.log("Seed completed.");
  console.log("  Super admin: " + SUPER_ADMIN.email + " / " + SUPER_ADMIN.password);
  console.log("  Teachers & students (test login): " + DEFAULT_PASSWORD);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
