import { DrizzleRecipeRepository } from './infrastructure/drizzle-recipe.repository';
import { DrizzleBakeQueueRepository } from './infrastructure/drizzle-bake-queue.repository';
import { CreateRecipeUseCase } from './application/use-cases/create-recipe.use-case';
import { QueueBakeOrderUseCase } from './application/use-cases/queue-bake-order.use-case';
import { CompleteBakeOrderUseCase } from './application/use-cases/complete-bake-order.use-case';
import { UpdateBakeStatusUseCase } from './application/use-cases/update-bake-status.use-case';
import { FetchBakeQueueUseCase } from './application/use-cases/fetch-bake-queue.use-case';

// Instancias singleton de repositorios
export const recipeRepository = new DrizzleRecipeRepository();
export const bakeQueueRepository = new DrizzleBakeQueueRepository();

// Casos de uso
export const createRecipeUseCase = new CreateRecipeUseCase(recipeRepository);
export const queueBakeOrderUseCase = new QueueBakeOrderUseCase(bakeQueueRepository, recipeRepository);
export const completeBakeOrderUseCase = new CompleteBakeOrderUseCase(bakeQueueRepository, recipeRepository);
export const updateBakeStatusUseCase = new UpdateBakeStatusUseCase(bakeQueueRepository, completeBakeOrderUseCase);
export const fetchBakeQueueUseCase = new FetchBakeQueueUseCase(bakeQueueRepository);

export * from './domain/entities';
export * from './domain/repositories';
export * from './application/dtos/recipe-dtos';
export * from './application/dtos/bake-order-dtos';
export * from './application/use-cases/create-recipe.use-case';
export * from './application/use-cases/queue-bake-order.use-case';
export * from './application/use-cases/complete-bake-order.use-case';
export * from './application/use-cases/update-bake-status.use-case';
export * from './application/use-cases/fetch-bake-queue.use-case';
