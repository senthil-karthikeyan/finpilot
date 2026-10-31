import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { sql, eq, asc, desc } from 'drizzle-orm';
import {
  type Goal,
  type GoalType,
  type GoalPriority,
} from '@finpilot/shared';
import { DRIZZLE_DB, type DrizzleDb } from '../database/database.module.js';
import * as schema from '../database/schema/index.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { UpdateGoalDto } from './dto/update-goal.dto.js';

@Injectable()
export class GoalsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  /**
   * Helper to transform a database row into the shared Goal model
   * with calculated funded percentage and overdue status.
   */
  private mapGoal(r: typeof schema.goals.$inferSelect): Goal {
    const today = new Date().toISOString().slice(0, 10);
    const target = parseFloat(r.targetAmount) || 0;
    const funded = parseFloat(r.currentFundedAmount) || 0;
    const fundedPct =
      target > 0 ? Number(((funded / target) * 100).toFixed(2)) : 0;
    const isOverdue = r.targetDate < today && funded < target;

    return {
      id: r.goalId,
      goalId: r.goalId,
      customerId: r.customerId,
      name: r.goalName,
      goalName: r.goalName,
      type: r.goalType as GoalType,
      goalType: r.goalType as GoalType,
      priority: r.priority as GoalPriority,
      targetAmount: target,
      currentAmount: funded,
      currentFundedAmount: funded,
      fundedPct,
      targetDate: r.targetDate,
      isOverdue,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * List all financial goals for a customer.
   */
  async getCustomerGoals(id: string): Promise<Goal[]> {
    const customerId = id.trim().toUpperCase();

    // 1. Verify customer exists
    const [customer] = await this.db
      .select({ customerId: schema.customers.customerId })
      .from(schema.customers)
      .where(eq(schema.customers.customerId, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // 2. Fetch all goals ordered by target date and priority
    const rows = await this.db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.customerId, customerId))
      .orderBy(asc(schema.goals.targetDate), asc(schema.goals.priority));

    return rows.map((r) => this.mapGoal(r));
  }

  /**
   * Create a new financial goal for a customer.
   * Enforces targetDate >= CURRENT_DATE and name between 3 and 60 characters.
   */
  async createGoal(id: string, dto: CreateGoalDto): Promise<Goal> {
    const customerId = id.trim().toUpperCase();

    // 1. Verify customer exists
    const [customer] = await this.db
      .select({ customerId: schema.customers.customerId })
      .from(schema.customers)
      .where(eq(schema.customers.customerId, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // 2. Validate goal name (3–60 chars)
    const name = (dto.goalName || dto.name)?.trim();
    if (!name || name.length < 3 || name.length > 60) {
      throw new BadRequestException(
        'Goal name must be between 3 and 60 characters.',
      );
    }

    // 3. Validate goal type
    const type = dto.goalType || dto.type;
    if (!type) {
      throw new BadRequestException('Goal type is required.');
    }

    // 4. Validate target date rule: targetDate >= today
    const today = new Date().toISOString().slice(0, 10);
    if (dto.targetDate < today) {
      throw new UnprocessableEntityException(
        'Target date must be today or in the future.',
      );
    }

    // 5. Generate next sequential goalId (e.g. G00178)
    const [maxRow] = await this.db
      .select({ goalId: schema.goals.goalId })
      .from(schema.goals)
      .where(sql`${schema.goals.goalId} ~ '^G[0-9]+$'`)
      .orderBy(
        sql`length(${schema.goals.goalId}) DESC`,
        desc(schema.goals.goalId),
      )
      .limit(1);

    let nextNum = 1;
    if (maxRow?.goalId) {
      const match = maxRow.goalId.match(/^G(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const goalId = `G${String(nextNum).padStart(5, '0')}`;

    // 6. Insert new goal
    const targetAmount = String(dto.targetAmount);
    const currentFundedAmount = String(
      dto.currentFundedAmount ?? dto.currentAmount ?? 0,
    );

    const [inserted] = await this.db
      .insert(schema.goals)
      .values({
        goalId,
        customerId,
        goalType: type,
        goalName: name,
        targetAmount,
        currentFundedAmount,
        targetDate: dto.targetDate,
        priority: dto.priority,
      })
      .returning();

    return this.mapGoal(inserted);
  }

  /**
   * Update an existing financial goal.
   * If targetDate is provided and changed, it must be today or in the future.
   * If unchanged, past dates are permitted.
   */
  async updateGoal(goalId: string, dto: UpdateGoalDto): Promise<Goal> {
    const cleanGoalId = goalId.trim().toUpperCase();

    // 1. Verify goal exists
    const [existing] = await this.db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.goalId, cleanGoalId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    // 2. Validate target date rule:
    // If targetDate provided and changed, enforce >= today.
    if (dto.targetDate !== undefined && dto.targetDate !== existing.targetDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (dto.targetDate < today) {
        throw new UnprocessableEntityException(
          'Target date must be today or in the future when updating date.',
        );
      }
    }

    // 3. Validate name if provided
    const name = dto.goalName ?? dto.name;
    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length < 3 || trimmed.length > 60) {
        throw new BadRequestException(
          'Goal name must be between 3 and 60 characters.',
        );
      }
    }

    // 4. Construct update payload
    const updateValues: Partial<typeof schema.goals.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateValues.goalName = name.trim();
    if (dto.goalType || dto.type) {
      updateValues.goalType = dto.goalType || dto.type;
    }
    if (dto.priority) updateValues.priority = dto.priority;
    if (dto.targetAmount !== undefined) {
      updateValues.targetAmount = String(dto.targetAmount);
    }
    if (
      dto.currentFundedAmount !== undefined ||
      dto.currentAmount !== undefined
    ) {
      updateValues.currentFundedAmount = String(
        dto.currentFundedAmount ?? dto.currentAmount,
      );
    }
    if (dto.targetDate !== undefined) {
      updateValues.targetDate = dto.targetDate;
    }

    const [updated] = await this.db
      .update(schema.goals)
      .set(updateValues)
      .where(eq(schema.goals.goalId, existing.goalId))
      .returning();

    return this.mapGoal(updated);
  }

  /**
   * Delete an existing financial goal.
   */
  async deleteGoal(
    goalId: string,
  ): Promise<{ success: boolean; goalId: string }> {
    const cleanGoalId = goalId.trim().toUpperCase();

    const [existing] = await this.db
      .select({ goalId: schema.goals.goalId })
      .from(schema.goals)
      .where(eq(schema.goals.goalId, cleanGoalId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    await this.db
      .delete(schema.goals)
      .where(eq(schema.goals.goalId, cleanGoalId));

    return { success: true, goalId: cleanGoalId };
  }
}

