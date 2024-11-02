POST http://localhost:9512/auth/login
[FormParams]
identifier: email@example6.com
key: password123
HTTP 200
[Captures]
token: cookie "access_token"

GET http://localhost:9512/api/documents
[Cookies]
access_token: {{token}}
HTTP 200

POST http://localhost:9512/api/document
[FormParams]
name: Test Document
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path:
documentType: file
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
jsonpath "$[*].documentPath" includes "test-document"


POST http://localhost:9512/api/document
[FormParams]
name: Test Folder
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path:
documentType: folder
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
jsonpath "$[*].documentPath" includes "test-folder"

POST http://localhost:9512/api/document
[FormParams]
name: Test file inside folder
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder
documentType: file
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
jsonpath "$[*].documentPath" includes "test-folder.test-file-inside-folder"

POST http://localhost:9512/api/document
[FormParams]
name: Test folder inside folder
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder
documentType: folder
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
jsonpath "$[*].documentPath" includes "test-folder.test-folder-inside-folder"

POST http://localhost:9512/api/document
[FormParams]
name: egor file
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder.test-folder-inside-folder
documentType: file
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
jsonpath "$[*].documentPath" includes "test-folder.test-folder-inside-folder.egor-file"

POST http://localhost:9512/api/document
[FormParams]
name: egor file 2
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder.test-folder-inside-folder
documentType: file
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
jsonpath "$[*].documentPath" includes "test-folder.test-folder-inside-folder.egor-file-2"

POST http://localhost:9512/api/document_content
[FormParams]
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder.test-file-inside-folder
content: Hello World
[Cookies]
access_token: {{token}}
HTTP 200

POST http://localhost:9512/api/document_content
[FormParams]
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder
content: Hello World
[Cookies]
access_token: {{token}}
HTTP 400

POST http://localhost:9512/api/document_content
[FormParams]
projectName: Project 1
organizationName: Sagittarius
municipalityName: Krems
path: test-folder.test-folder-inside-folder
content: Hello World
[Cookies]
access_token: {{token}}
HTTP 400

GET http://localhost:9512/api/document_content
[QueryStringParams]
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder.test-file-inside-folder
[Cookies]
access_token: {{token}}
HTTP 200
[Asserts]
body contains "Hello World"

GET http://localhost:9512/api/document_content
[QueryStringParams]
projectName: Project 1
organizationName: Sagittarius
municipalityName: Krems
path: file-1
[Cookies]
access_token: {{token}}
HTTP 200

DELETE http://localhost:9512/api/document
[FormParams]
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-folder
[Cookies]
access_token: {{token}}
HTTP 200

DELETE http://localhost:9512/api/document
[FormParams]
projectName: Project 1
organizationName: Sagittarius
municipalityName: Krems
path: test-folder
[Cookies]
access_token: {{token}}
HTTP 400

DELETE http://localhost:9512/api/document
[FormParams]
projectName: Project 1
organizationName: Imc
municipalityName: Krems
path: test-document
[Cookies]
access_token: {{token}}
HTTP 200
