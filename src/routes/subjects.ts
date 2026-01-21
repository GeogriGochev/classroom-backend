import { Router } from "express";
import { db } from '../db';
import { subjects, departments } from '../db/schema/app';
import { and, desc, eq, getTableColumns, ilike, like, or, sql } from 'drizzle-orm';

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { search,department, page= 1, limit= 10 } = req.query

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;
    const filterConditions = [];

    // if search query exists filter the subject name or subject code
    if (search) {
      filterConditions.push(
        or(
          like(subjects.name, `%${search}%`),
          like(subjects.code, `%${search}%`),
        )
      );
    }

    // if department query exists filter the subject department
    if (department) {
      filterConditions.push(
        like(departments.name, `%${department}%`),
      );
      const deptPattern = `%${String(department).replace(/[&_]/g, '\\$&')}%`
      filterConditions.push(
        ilike(departments.name, deptPattern),
      );
    }

    // combine all filters using and if any exist
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;
    const countResult = await db
    .select({count: sql<number>`count(*)`})
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereClause);

    const totalCount = countResult[0]?.count || 0;

    const subjectsLists = await db.select({
      ...getTableColumns(subjects),
      department: getTableColumns(departments),
    }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereClause)
    .orderBy(desc(subjects.id))
    .limit(limitPerPage)
    .offset(offset); 

    res.status(200).json({
      data: subjectsLists,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;