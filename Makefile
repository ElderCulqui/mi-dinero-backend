.PHONY: help dev-up dev-down dev-ps dev-logs dev-shell dev-migrate dev-migrate-new dev-seed dev-test dev-reset prod-up prod-ps prod-logs deploy

COMPOSE_DEV  = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml
SVC ?= api
name ?= cambio

help: ## This help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help

dev-up: ## Levanta el entorno de desarrollo
	$(COMPOSE_DEV) up -d
dev-down: ## Apaga el entorno de desarrollo
	$(COMPOSE_DEV) down
dev-ps: ## Estado de los contenedores de desarrollo
	$(COMPOSE_DEV) ps
dev-logs: ## Logs de desarrollo (SVC=api|app)
	$(COMPOSE_DEV) logs -f --tail=100 $(SVC)
dev-shell: ## Shell en el contenedor de desarrollo
	$(COMPOSE_DEV) exec $(SVC) sh
dev-migrate: ## Aplica migraciones pendientes en dev
	$(COMPOSE_DEV) exec api npx prisma migrate deploy
dev-migrate-new: ## Nueva migracion en dev (name=...)
	$(COMPOSE_DEV) exec api npx prisma migrate dev --name $(name)
dev-seed: ## Carga el seed en dev
	$(COMPOSE_DEV) exec api npm run seed
dev-test: ## Ejecuta Jest en dev
	$(COMPOSE_DEV) exec api npx jest
dev-reset: ## Borra y recrea la base de desarrollo
	$(COMPOSE_DEV) exec api npx prisma migrate reset --force

prod-up: ## Levanta produccion
	$(COMPOSE_PROD) up -d --build
prod-ps: ## Estado de produccion
	$(COMPOSE_PROD) ps
prod-logs: ## Logs de produccion
	$(COMPOSE_PROD) logs -f --tail=100 $(SVC)

deploy: ## Despliega main a produccion
	./deploy.sh
