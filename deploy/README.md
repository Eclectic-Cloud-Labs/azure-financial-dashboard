first made the yaml files 
open powershell as admin
az aks get-credentials (downloads config file which has cluster api server address, auth token, )
az acr login --name gurboscontainerregistry
docker tag findash-api gurboscontainerregistry.azurecr.io/findash-api:latest
docker push gurboscontainerregistry.azurecr.io/findash-api:latest