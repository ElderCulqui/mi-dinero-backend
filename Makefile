.PHONY: help

CMD ?= ''

help: ## This help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help



start:  ## Start the application default locally
	@echo "Starting the application default locally"
	@docker-compose up -d

restart:  ## Restart the application default
	@echo "Restarting the application"
	@docker-compose restart

stop:  ## Stop the application default
	@echo "Stopping the application default"
	@docker-compose down

status:  ## Status the application
	@echo "Showing the status for the application"
	@docker-compose ps

logs:	## Show the all Logs from the application
	@echo "Showing all logs for every container"
	@docker-compose logs -f --tail="50"

cli:  ## Enter to container console from API MI DINERO
	@echo "Entering to container console from MI DINERO API"
	@docker exec -ti mi_dinero_api sh