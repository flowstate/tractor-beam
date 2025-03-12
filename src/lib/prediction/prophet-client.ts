import type {
  DemandPredictionRequest,
  DemandPredictionResponse,
  PredictionServiceClient,
  InventoryRecommendationRequest,
  InventoryRecommendation,
  SupplierPerformancePredictionRequest,
  SupplierPerformancePredictionResponse,
} from './prediction.types'

const PROPHET_SERVICE_URL = 'http://localhost:5001'

export class ProphetClient implements PredictionServiceClient {
  async predictDemand(
    request: DemandPredictionRequest
  ): Promise<DemandPredictionResponse> {
    try {
      const requestMetadata = {
        historicalDataPoints: request.historicalData.length,
        dateRange: {
          start: request.historicalData[0]?.date,
          end: request.historicalData[request.historicalData.length - 1]?.date,
        },
        futurePeriods: request.futurePeriods,
        filters: {
          locationId: request.locationId,
          modelId: request.modelId,
        },
      }

      console.log('Sending request to Prophet service:', requestMetadata)

      const response = await this.makeApiRequest<DemandPredictionResponse>(
        '/predict/demand',
        request
      )

      return response
    } catch (error) {
      console.error('Error predicting demand:', error)
      throw error
    }
  }

  async predictSupplierPerformance(
    request: SupplierPerformancePredictionRequest
  ): Promise<SupplierPerformancePredictionResponse> {
    try {
      const requestMetadata = {
        historicalDataPoints: request.historicalData.length,
        dateRange: {
          start: request.historicalData[0]?.date,
          end: request.historicalData[request.historicalData.length - 1]?.date,
        },
        futurePeriods: request.futurePeriods,
        supplier: request.supplierId,
      }

      console.log(
        'Sending supplier performance request to Prophet service:',
        requestMetadata
      )

      const response =
        await this.makeApiRequest<SupplierPerformancePredictionResponse>(
          '/predict/supplier-performance',
          request
        )

      return response
    } catch (error) {
      console.error('Error predicting supplier performance:', error)
      throw error
    }
  }

  async generateInventoryRecommendation(
    request: InventoryRecommendationRequest
  ): Promise<InventoryRecommendation> {
    throw new Error('Not yet implemented: generateInventoryRecommendation')
  }

  private async makeApiRequest<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${PROPHET_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Prophet service error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      )
    }

    return response.json() as Promise<T>
  }
}

// Create a singleton instance for use throughout the app
export const prophetClient = new ProphetClient()
