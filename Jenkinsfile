pipeline {
    agent {
        label 'test'
    }
    environment {
        // Example of setting an environment variable conditionally
        IS_WIN = "${isUnix() ? 'false' : 'true'}"
    }
    stages {
        stage ('git clone') {
            steps {
                git branch: 'main', url: 'https://github.com/varun-polampalli/testpilot1.git'
            }
        }
        stage('Environment Check') {
            steps {
                script {
                    if (env.IS_WIN == 'true') {
                        // Windows specific command
                        echo 'Running on Windows'
                    } else {
                        // Unix/Linux specific command
                        echo 'Running on Unix/Linux'
                    }
                }
            }
        }
        stage ('node') {
            steps {
                script {
                    if (env.IS_WIN == 'true') {
                        bat 'npm install'
                        bat 'npm run build'
                    } else {
                        sh 'npm install'
                        sh 'npm run build'
                    }
                }
            }
        }
        stage ('testpilot') {
            environment {
                TIMESTAMP = "${new java.text.SimpleDateFormat('yyyyMMddHHmmss').format(new Date())}"
            }
            steps {
                script {
                    def reportDir = "report_${env.TIMESTAMP}"
                    if (env.IS_WIN == 'true') {
                        // Correcting path separator for Windows in the command
                        bat "node benchmark/run.js --outputDir .\\${reportDir} --package C:\\Users\\varung\\Desktop\\varun\\testpilot"
                    } else {
                        // Assuming a similar command would be used for Unix/Linux, with appropriate path adjustments
                        sh "node benchmark/run.js --outputDir ./${reportDir} --package /path/to/testproject"
                    }
                }
            }
        }
    }
}
