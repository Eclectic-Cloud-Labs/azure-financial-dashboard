# Phase 0

# Create app registration in Entra
az ad app create --display-name gurbosApp 
# Create SP attached to App Reg (create-with-rbac not used here because of deployment issues)
az ad sp create --id <AppId>
# assign sp a Contributor role at subscription scope
az role assignment create --name SpRoleAsg-Contr --assignee-object-id <SpId> --role Contributor --scope /subscriptions/<SubscriptionId>
# assign 2 fed cred's to the App Reg 
az ad app federated-credential create --id <AppId> --parameters "scripts\fdMain.json"
az ad app federated-credential create --id <AppId> --parameters "   scripts\fdPr.json"
