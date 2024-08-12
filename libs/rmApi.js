
export class RmApi {    

    createLink(linkFromRef, linkType, linkToRef) {
        return new Promise((resolve, reject) => {   
            try {         
                RM.Data.createLink(linkFromRef, linkType, linkToRef, (linkResult) => {        
                    resolve(linkResult);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    deleteLink(linkFromRef, linkType, linkToRef) {
        return new Promise((resolve, reject) => {   
            try {         
                RM.Data.deleteLink(linkFromRef, linkType, linkToRef, (linkResult) => {        
                    resolve(linkResult.code);
                });
            } catch (err) {
                reject(err);
            }
        });
    }
    getConfigurationContext() {
        return new Promise((resolve, reject) => {
            try {
                RM.Client.getCurrentConfigurationContext(function(result) {
                    if (result.code === RM.OperationResult.OPERATION_OK) {
                        resolve(result.data);
                    } else {
                        resolve(null);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    getContentsAttributes(moduleRef, attributes) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.getContentsAttributes(moduleRef, attributes, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        
    }

    getAttributesFromList(moduleRef, attributes) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.getAttributes(moduleRef, attributes, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        

    }

    getAllAttributes(moduleRef) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.getAttributes(moduleRef, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });
    }
    
    showArtifactPicker() {
        return new Promise((resolve, reject) => {
            try {
                RM.Client.showArtifactPicker((result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        
    }

    getAllLinkedArtifacts(artifactRef) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.getLinkedArtifacts(artifactRef, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    getContentsStructure(moduleRef, attributes) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.getContentsStructure(moduleRef, attributes, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        
    }
    
    getValueRange(moduleRef, attributes) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.getValueRange(moduleRef, attributes, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        
    }     

    setAttributes(attrsToSet) {
        return new Promise((resolve, reject) => {
            try {
                RM.Data.setAttributes(attrsToSet, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        
    }         

    setSelection(artifactsRefs) {
        return new Promise((resolve, reject) => {
            try {
                RM.Client.setSelection(artifactsRefs, (result) => {
                    resolve(result);
                });
            } catch (err) {
                reject(err);
            }
        });        

    }
}