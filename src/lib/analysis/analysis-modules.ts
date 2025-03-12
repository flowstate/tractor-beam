import { analyzeSupplierPerformance } from './supplier-performance'
import { analyzeDemandPatterns } from './demand-patterns'
import { analyzeComponentRisks } from './component-risks'
import { calculateInventoryParameters } from './inventory-parameters'

/**
 * Analyzes supplier performance patterns from historical data
 * - Extracts reliability metrics (lead time variance)
 * - Calculates quality metrics (component failure rates)
 * - Identifies seasonal performance variations
 * - Computes location-specific performance differences
 */
export { analyzeSupplierPerformance }

/**
 * Analyzes demand patterns from historical data
 * - Calculates seasonal demand coefficients by model and location
 * - Extracts market sensitivity factors
 * - Computes price sensitivity factors
 * - Generates correlation matrices between economic indicators and demand
 */
export { analyzeDemandPatterns }

/**
 * Analyzes component risk factors from historical data
 * - Calculates failure rate distributions by supplier and component
 * - Identifies critical threshold indicators
 * - Performs cost-impact analysis of failures
 * - Extracts seasonal failure rate variations by supplier
 */
export { analyzeComponentRisks }

/**
 * Calculates inventory optimization parameters based on other analysis results
 * - Determines optimal inventory levels by component, location, and season
 * - Calculates reorder points
 * - Recommends safety stock levels based on supplier reliability
 * - Develops inflation-adjusted purchasing strategies
 */
export { calculateInventoryParameters }
