# Tractor Beam

A supply chain management and forecasting application for optimizing inventory, supplier allocation, and demand prediction.

## Prerequisites

- [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/)
- Prophet Service - companion forecasting service

## Setup Instructions

### 1. Set up the Prophet Service

Clone and run the companion Prophet Service from:
[https://github.com/flowstate/the-proph](https://github.com/flowstate/the-proph)

### 2. Start Docker

Ensure Docker is running on your system, then execute the Docker Compose file at the root of the project:

```bash
docker-compose up -d
```

### 3. Install Dependencies

Install project dependencies using Yarn:

```bash
yarn
```

### 4. Initialize the Database

Reset and initialize the database with the following command:

```bash
yarn db:reset
```

This command performs several operations:

- Clears all existing data
- Seeds the database with initial data
- Generates historical data
- Runs data analysis
- Generates forecasts
- Creates recommendations
- Prepares visualization data

### 5. Start the Application

```bash
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)
