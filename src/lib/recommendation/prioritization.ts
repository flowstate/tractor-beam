import type { ComponentId, LocationId } from '~/lib/types/types'
import type {
  RecommendationStatus,
  RecommendationUrgency,
  RecommendationImpactLevel,
  RecommendationPriority,
} from '~/lib/types/types'
import { COMPONENTS } from '~/lib/constants'
import { debugLog } from './impact-calculator'

// Constants for prioritization
export const PRIORITY_WEIGHTS = {
  COST: 0.7, // 70% weight for cost impact
  RISK: 0.3, // 30% weight for risk impact
}

// Thresholds for opportunity levels
export const OPPORTUNITY_THRESHOLDS = {
  COST: {
    HIGH: -500000, // Cost savings of $500k or more is high impact
    MODERATE: -100000, // Cost savings between $100k-$500k is moderate impact
  },
  RISK: {
    HIGH: 0.5, // Risk reduction of 0.5 or more is high impact
    MODERATE: 0.2, // Risk reduction between 0.2-0.5 is moderate impact
  },
}

/**
 * Determines the status of a recommendation based on its impact
 */
export function determineRecommendationStatus(
  costDelta: number,
  riskDelta: number,
  componentId: ComponentId
): RecommendationStatus {
  // Get component details to adjust thresholds based on component value
  const component = COMPONENTS[componentId]
  const isHighValue =
    component?.name.includes('ENGINE') || component?.name.includes('PREMIUM')

  // Define thresholds based on component value
  const thresholds = {
    cost: isHighValue
      ? { warning: -500000, critical: -2000000 }
      : { warning: -100000, critical: -500000 },
    risk: isHighValue
      ? { warning: 0.5, critical: 1.0 }
      : { warning: 0.3, critical: 0.7 },
  }

  // Check for high-impact status first (early return)
  if (
    costDelta <= thresholds.cost.critical ||
    riskDelta >= thresholds.risk.critical
  ) {
    return 'high-impact'
  }

  // Then check for opportunity status
  if (
    costDelta <= thresholds.cost.warning ||
    riskDelta >= thresholds.risk.warning
  ) {
    return 'opportunity'
  }

  // Default to optimal
  return 'optimal'
}

/**
 * Enhances recommendation rationale with impact information
 */
export function enhanceRationaleWithImpact(
  originalRationale: string[],
  unitDelta: number,
  costDelta: number,
  riskDelta: number,
  priority: RecommendationPriority
): string[] {
  const enhancedRationale = [...originalRationale]

  // Add priority context
  const priorityContext =
    priority === 'critical'
      ? 'This is a high-priority opportunity that requires immediate attention.'
      : priority === 'important'
        ? 'This is an important opportunity to improve your supply chain.'
        : priority === 'standard'
          ? 'This represents a standard optimization opportunity.'
          : 'This is an optional improvement that can be considered when time permits.'

  enhancedRationale.unshift(priorityContext)

  // Add impact information with positive framing
  if (unitDelta !== 0) {
    const unitMessage =
      unitDelta > 0
        ? `Opportunity to optimize inventory by adding ${unitDelta} units.`
        : `Opportunity to reduce inventory by ${Math.abs(unitDelta)} units while maintaining service levels.`
    enhancedRationale.push(unitMessage)
  }

  if (costDelta !== 0) {
    const costMessage =
      costDelta < 0
        ? `Potential savings of $${Math.abs(costDelta).toLocaleString()} with this allocation strategy.`
        : `Investment of $${costDelta.toLocaleString()} to improve reliability and service levels.`
    enhancedRationale.push(costMessage)
  }

  if (riskDelta > 0) {
    const riskPercentage = Math.round(riskDelta * 100)
    enhancedRationale.push(
      `Opportunity to improve supply chain reliability by approximately ${riskPercentage}%.`
    )
  }

  return enhancedRationale
}

/**
 * Formats a cost impact value for display
 */
export function formatCostImpact(costDelta: number): string {
  if (costDelta < 0) {
    return `-$${Math.abs(costDelta).toLocaleString()}`
  } else {
    return `+$${costDelta.toLocaleString()}`
  }
}

/**
 * Calculates the total cost impact across all recommendations
 */
export function calculateTotalCostImpact(
  costDeltas: Record<LocationId, Record<ComponentId, number>>
): number {
  let totalImpact = 0

  for (const locationId in costDeltas) {
    for (const componentId in costDeltas[locationId as LocationId]) {
      totalImpact +=
        costDeltas[locationId as LocationId][componentId as ComponentId]
    }
  }

  return totalImpact
}

/**
 * Calculates the percentage of recommendations that reduce risk
 */
export function calculateRiskReductionPercentage(
  riskDeltas: Record<LocationId, Record<ComponentId, number>>
): number {
  let totalRecommendations = 0
  let riskReducingRecommendations = 0

  for (const locationId in riskDeltas) {
    for (const componentId in riskDeltas[locationId as LocationId]) {
      totalRecommendations++
      if (
        riskDeltas[locationId as LocationId][componentId as ComponentId] > 0
      ) {
        riskReducingRecommendations++
      }
    }
  }

  return totalRecommendations > 0
    ? (riskReducingRecommendations / totalRecommendations) * 100
    : 0
}

/**
 * Determines the urgency of a recommendation based on quarter and component
 */
export function determineRecommendationUrgency(
  quarter: number,
  componentId: ComponentId
): RecommendationUrgency {
  // Q1 recommendations are generally more urgent
  if (quarter === 1) {
    // Critical components are always immediate in Q1
    const component = COMPONENTS[componentId]
    if (
      component?.name.includes('ENGINE') ||
      component?.baselineFailureRate > 0.03
    ) {
      return 'immediate'
    }
    return 'upcoming'
  }

  // Q2 recommendations are less urgent
  return 'future'
}

/**
 * Determines the impact level of a recommendation based on cost and risk deltas
 */
export function determineRecommendationImpact(
  costDelta: number,
  riskDelta: number,
  componentId: ComponentId
): RecommendationImpactLevel {
  // Get component details to adjust thresholds
  const component = COMPONENTS[componentId]
  const isHighValue =
    component?.name.includes('ENGINE') || component?.name.includes('PREMIUM')

  // Adjust thresholds based on component value
  const thresholds = {
    cost: isHighValue
      ? {
          high: OPPORTUNITY_THRESHOLDS.COST.HIGH * 2,
          moderate: OPPORTUNITY_THRESHOLDS.COST.MODERATE * 2,
        }
      : {
          high: OPPORTUNITY_THRESHOLDS.COST.HIGH,
          moderate: OPPORTUNITY_THRESHOLDS.COST.MODERATE,
        },
    risk: isHighValue
      ? {
          high: OPPORTUNITY_THRESHOLDS.RISK.HIGH * 1.5,
          moderate: OPPORTUNITY_THRESHOLDS.RISK.MODERATE * 1.5,
        }
      : {
          high: OPPORTUNITY_THRESHOLDS.RISK.HIGH,
          moderate: OPPORTUNITY_THRESHOLDS.RISK.MODERATE,
        },
  }

  // Log the impact calculation inputs and thresholds
  debugLog(
    {
      componentId,
      isHighValue,
      costDelta,
      riskDelta,
      thresholds,
      costHighCheck: costDelta <= thresholds.cost.high,
      costModerateCheck: costDelta <= thresholds.cost.moderate,
      riskHighCheck: riskDelta >= thresholds.risk.high,
      riskModerateCheck: riskDelta >= thresholds.risk.moderate,
    },
    `impact_determination_${componentId}`
  )

  // Determine impact based on cost or risk (whichever is higher)
  if (costDelta <= thresholds.cost.high || riskDelta >= thresholds.risk.high) {
    return 'high'
  }

  if (
    costDelta <= thresholds.cost.moderate ||
    riskDelta >= thresholds.risk.moderate
  ) {
    return 'moderate'
  }

  return 'low'
}

/**
 * Determines the combined priority of a recommendation based on urgency and impact
 */
export function determineRecommendationPriority(
  urgency: RecommendationUrgency,
  impact: RecommendationImpactLevel
): RecommendationPriority {
  // Priority matrix:
  //             | High Impact | Moderate Impact | Low Impact
  // ------------|-------------|-----------------|------------
  // Immediate   | Critical    | Important       | Standard
  // Upcoming    | Important   | Standard        | Optional
  // Future      | Standard    | Optional        | Optional

  const priorityMatrix: Record<
    RecommendationUrgency,
    Record<RecommendationImpactLevel, RecommendationPriority>
  > = {
    immediate: {
      high: 'critical',
      moderate: 'important',
      low: 'standard',
    },
    upcoming: {
      high: 'important',
      moderate: 'standard',
      low: 'optional',
    },
    future: {
      high: 'standard',
      moderate: 'optional',
      low: 'optional',
    },
  }

  const priority = priorityMatrix[urgency][impact]

  // Log the priority determination
  debugLog(
    {
      urgency,
      impact,
      resultingPriority: priority,
    },
    `priority_determination_${urgency}_${impact}`
  )

  return priority
}

/**
 * Calculates an opportunity score for sorting recommendations
 * Higher score = better opportunity
 */
export function calculateOpportunityScore(
  costDelta: number,
  riskDelta: number,
  urgency: RecommendationUrgency,
  componentId: ComponentId
): number {
  // Normalize cost impact (negative cost is good)
  const normalizedCost = Math.min(Math.abs(costDelta) / 1000000, 1) // Scale to 0-1 range

  // Normalize risk impact (positive risk reduction is good)
  const normalizedRisk = Math.max(0, Math.min(riskDelta / 1, 1)) // Scale to 0-1 range

  // Urgency multiplier
  const urgencyMultiplier =
    urgency === 'immediate' ? 1.0 : urgency === 'upcoming' ? 0.6 : 0.3 // future

  // Component importance multiplier
  const component = COMPONENTS[componentId]
  const componentMultiplier = component?.name.includes('ENGINE')
    ? 1.2
    : component?.name.includes('PREMIUM')
      ? 1.1
      : 1.0

  // Calculate final score (higher is better)
  const score =
    (normalizedCost * PRIORITY_WEIGHTS.COST +
      normalizedRisk * PRIORITY_WEIGHTS.RISK) *
    urgencyMultiplier *
    componentMultiplier *
    100 // Scale to a 0-100 range for readability

  // Log the opportunity score calculation
  debugLog(
    {
      componentId,
      costDelta,
      riskDelta,
      normalizedCost,
      normalizedRisk,
      urgency,
      urgencyMultiplier,
      componentMultiplier,
      weightedCost: normalizedCost * PRIORITY_WEIGHTS.COST,
      weightedRisk: normalizedRisk * PRIORITY_WEIGHTS.RISK,
      finalScore: score,
    },
    `opportunity_score_${componentId}`
  )

  return score
}

/**
 * Adds a function to prioritize Q2 recommendations lower
 * @deprecated Consider using the urgency/impact/priority system instead which already accounts for quarters
 */
export function adjustStatusForQuarter(
  status: RecommendationStatus,
  quarter: number
): RecommendationStatus {
  // For Q2, downgrade the status one level
  if (quarter === 2) {
    if (status === 'high-impact') return 'opportunity'
    if (status === 'opportunity') return 'optimal'
  }
  return status
}
