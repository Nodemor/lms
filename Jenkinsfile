// Nodemore LMS: build, test and deploy on every push to main.
// Tests run inside the image builds (Maven runs the backend tests; the frontend build runs the
// translation check), so a failing test stops the pipeline BEFORE the running site is touched.
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 45, unit: 'MINUTES')
  }

  triggers {
    githubPush()
  }

  environment {
    COMPOSE = 'docker compose -p nodemore -f docker-compose.prod.yml --env-file /opt/nodemore/.env'
  }

  stages {
    stage('Main branch only') {
      steps {
        script {
          def b = env.GIT_BRANCH ?: ''
          if (!(b == 'main' || b == 'origin/main' || b == 'refs/heads/main')) {
            currentBuild.result = 'NOT_BUILT'
            error("Only the main branch is deployed (got '${b}').")
          }
        }
      }
    }

    stage('Pre-flight') {
      steps {
        sh 'test -f /opt/nodemore/.env || (echo "Missing /opt/nodemore/.env on the server" && exit 1)'
        sh 'docker version --format "Docker {{.Server.Version}}"'
        sh "${COMPOSE} config --quiet"
      }
    }

    stage('Build & test') {
      steps {
        sh "${COMPOSE} build --pull"
      }
    }

    stage('Deploy') {
      steps {
        sh "${COMPOSE} up -d --remove-orphans"
      }
    }

    stage('Health check') {
      steps {
        sh '''
          for i in $(seq 1 40); do
            if docker exec nodemore-backend curl -fsS http://localhost:8080/actuator/health >/dev/null 2>&1; then
              echo "Backend is healthy"
              exit 0
            fi
            sleep 5
          done
          echo "Backend did not become healthy in time. Last log lines:"
          docker logs --tail 150 nodemore-backend
          exit 1
        '''
      }
    }
  }

  post {
    success {
      echo 'Deployed: https://academy.nodemor.io'
    }
    failure {
      echo 'Pipeline failed. If the site is affected, revert the last commit on GitHub to redeploy the previous version.'
    }
    always {
      sh 'docker image prune -f >/dev/null 2>&1 || true'
    }
  }
}
