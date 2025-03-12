import type {
  SupplierId,
  ComponentId,
  LocationId,
  TractorModelId,
} from './types'

export interface ModelDemand {
  modelId: TractorModelId
  demandUnits: number
}

export interface ComponentInventory {
  supplier: SupplierId
  componentId: ComponentId
  quantity: number
}

export interface Delivery {
  supplier: SupplierId
  componentId: ComponentId
  orderSize: number
  leadTimeVariance: number // Renamed: negative = early, positive = late
  discount: number
}

export interface ComponentFailure {
  supplier: SupplierId
  componentId: ComponentId
  failureRate: number // 0-1
}

export interface DailyLocationReport {
  date: Date
  location: LocationId // State code
  marketTrendIndex: number // 0-1, same for all locations on a given day
  inflationRate: number // Local economic conditions
  modelDemand: ModelDemand[]
  componentInventory: ComponentInventory[]
  deliveries: Delivery[]
  componentFailures: ComponentFailure[]
}

export interface DailyReport {
  date: Date
  locationReports: DailyLocationReport[]
}
