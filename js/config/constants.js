// Constants
const LOCAL_STORAGE_CLIENT_ID_KEY = "alm-local-client-id"

const REQ_PER_TIME = 15
const STRING_DATA_TYPE_RDF_URI = "http://www.w3.org/2001/XMLSchema#string"
const ATTRIBUTE_TAG_NAME = "rm:AttributeDefinition"
const ARTIFACT_TYPE_TAG_NAME = "rm:ObjectType"

const TRANSLATE_ATTR_NAME = "H_Translate"
const TOXIC_ATTR_NAME = "H_Toxic"
const QUALITY_ATTR_NAME = "H_Quality"
const CONSISTENCY_ATTR_NAME = "H_Consistency"
const ATTR_RDF_URI_DOMAIN = "http://jazz.company.com/rm/attributes#"
const NO_VIEW_STRING = "no-view"
const BOUND_ARTIFACT_OBJ = "R1.<http://www.ibm.com/xmlns/rdm/rdf/boundArtifact>_obj"

const IBM_XML_TAG_NAMES = {
    oslcConfigComponent: "oslc_config:component",
    projectArea: "process:projectArea",
    dctermsTitle: "dcterms:title",
    dctermsDesc: "dcterms:description",
    dctermsId: "dcterms:identifier",
    oslcShortId: "oslc:shortId",
    rqmShortId: "rqm_qm:shortIdentifier",
    owlSameAs: "owl:sameAs",
    rm: {
        ofType: "rm:ofType",
        objectType: "rm:ObjectType",
        enumEntry: "rm:enumEntry",
        hasAttrDef: "rm:hasAttrDef",
        artifact: "rm:Artifact",
        hasAttrVal: "rm:hasAttrVal",
    },
    testCase: {
        validateReq: "oslc_qm:validatesRequirement",
    },
    link: {
        predicate: "rdf:predicate",
        object: "rdf:object",
    },
    attribute: {
        range: "rm:range",
        objectType: "attribute:objectType",
    },
    ds: {
        component: "ds:component",
        artifact: "ds:artifact",
    },
    rdfValue: "rdf:value",
    rdfType: "rdf:type",
    view: {
        displayProps: "rm:displayBaseProperties",
        rowQuery: "rm:rowquery",
        select: "rql:select",
        shared: "dng_view:shared",
        applicability: "dng_view:applicability",
        scopedArtifact: "dng_view:scopedArtifact",
        viewDef: "dng_view:ViewDefinition",
    },
    dng: {
        components: "jp06:components",
        url: "jp06:url",
        projectArea: "jp06:project-area",
    },
    rdfDescription: "rdf:Description",
    oslcPagination: {
        next: "oslc:nextPage",
    },
    oslc: {
        instanceShape: "oslc:instanceShape",
    },
    rrm: {
        title: "rrm:title",
        desc: "rrm:description",
        id: "rrm:identifier",
        about: "rrm:about",
    },
}

const IBM_XML_TAG_ATTRS = {
    about: "rdf:about",
    resource: "rdf:resource",
    id: "rdf:ID",
    parseType: "rdf:parseType",
}

const company_RM_ARTIFACT_TYPE_URIS = {
    HWRequirement: "http://jazz.company.com/rm/artifacttypes#HWRequirement",
    MDRequirement: "http://jazz.company.com/rm/artifacttypes#MDRequirement",
    SWRequirement: "http://jazz.company.com/rm/artifacttypes#SWRequirement",
    SysRequirement: "http://jazz.company.com/rm/artifacttypes#SystemRequirement",
    InterfaceSpecModule: "http://jazz.company.com/rm/artifacttypes#InterfaceSpecificationModule",
    SWReqSpecModule: "http://jazz.company.com/rm/artifacttypes#SWRequirementsSpecificationModule",
    HWReqSpecModule: "http://jazz.company.com/rm/artifacttypes#HWRequirementsSpecificationModule",
    MDReqSpecModule: "http://jazz.company.com/rm/artifacttypes#MDRequirementsSpecificationModule",
}

const company_RM_ATTR_TYPE_URIS = {
    functionalClassification: {
        uri: "http://jazz.company.com/rm/attributes#H_FunctionalClassification",
        enums: {
            functional: "http://jazz.company.com/rm/datatypes#FunctionalClassification_Type-Functional",
        },
    },
    safetyClassification: {
        uri: "http://jazz.company.com/rm/attributes#H_SafetyClassification",
        enums: {},
    },
    failureConsequence: {
        uri: "http://jazz.company.com/rm/attributes#H_FailureConsequence",
        enums: {
            tbd: "http://jazz.company.com/rm/datatypes#FailureConsequence_Type-TBD",
            low: "http://jazz.company.com/rm/datatypes#FailureConsequence_Type-low",
            medium: "http://jazz.company.com/rm/datatypes#FailureConsequence_Type-medium",
            high: "http://jazz.company.com/rm/datatypes#FailureConsequence_Type-high",
        },
    },
    enumerationValues: {
        uri: "http://jazz.company.com/rm/attributes#H_EnumerationValues",
    },
    minValue: {
        uri: "http://jazz.company.com/rm/attributes#H_MinValue",
    },
    maxValue: {
        uri: "http://jazz.company.com/rm/attributes#H_MaxValue",
    },
    resolution: {
        uri: "http://jazz.company.com/rm/attributes#H_Resolution",
    },
}

const company_TESTCASES_ATTRS = {
    testLevel: {
        externalUrl: "http://alm.company.com/qm/cat#H_TestLevel",
        title: "H_Test Level",
        values: {
            HWTest: "http://alm.company.com/qm/catval#HW_Test",
            MDTest: "http://alm.company.com/qm/catval#MD_Test",
            SWTest: "http://alm.company.com/qm/catval#SW_Test",
            SysTestFunc: "http://alm.company.com/qm/catval#SystemTestFunction",
        },
    },
    testType: {
        externalUrl: "http://alm.company.com/qm/cat#H_TestCaseType",
        title: "H_Test Case Type",
        categoryName: "Test Case",
    },
    relevance: {
        externalUrl: "http://alm.company.com/qm/cat#H_Ver_Criteria_Rel",
        title: "H_Relevance for Verification Criteria",
        categoryName: "Yes - Review DNG to ETM relation is required",
    },
    fuSa: {
        externalUrl: "http://alm.company.com/qm/cat#H_FuSaQMClass",
        title: "H_FuSa / QM Classification",
    },
}

const JAZZ_LINK_SERVICE_TRACE_LINKS = {
    validatedByRm: "http://open-services.net/ns/rm#validatedBy",
}

const EVENT_LOG_TYPE = {
    INFO: "INFO",
    SUCCESS: "SUCCESS",
    WARNING: "WARNING",
    ERROR: "ERROR",
}

// Local storage
const LOCAL_STORAGE_KEY = "nyan-ai-integrating"

// Error messages
const PRECONDITION_MESSAGES = {
    requireDngApp: {
        text: "Open DNG to start",
        type: "warning",
        resizeWidget: true,
        priority: 0,
    },
    requireModule: {
        text: "Open a module to start",
        type: "warning",
        priority: 1,
    },
    serverConnectError: {
        text: "The server might be down at the moment! Please try again later!",
        type: "error",
        priority: 2,
    },
    promptsConfigError: {
        text: "Failed to get prompts from the server! Please try again later!",
        type: "error",
        priority: 2,
    },
}

const STATS_WIDGET_ACTIONS = {
    translate: {
        request: {
            name: "Request Translate",
            description: "Translate artifacts to selected language",
        },
        update: {
            name: "Update H_Translate",
            description: "Save translation to H_Translation attributes",
        },
        remove: {
            name: "Remove Translation",
            description: "Ignore and discard Translation",
        }
    },
    consistency: {
        request: {
            name: "Request Consistency",
            description: "Check if requirements in module have contents that are contradictory to each other",
        },
        export: {
            name: "Export Consistency",
            description: "Export found inconsistency to an Excel file",
        },
        remove: {
            name: "Remove Consistency",
            description: "Ignore and discard Consistency",
        }
    },
    toxic: {
        request: {
            name: "Request Toxic",
            description: "Check if requirements lack constraints or might be changed later",
        },
        update: {
            name: "Update Toxic",
            description: "Save found toxic requirements' contents to H_Toxic attributes",
        },
        remove: {
            name: "Remove Toxic",
            description: "Ignore and discard Toxic",
        }
    },
    quality: {
        request: {
            name: "Request Quality",
            description: "Check if requirements meet the INCOSE standards, evaluating based on SMART criteria",
        },
        update: {
            name: "Update Quality",
            description: "Save requirments' quality results to H_Quality attributes",
        },
        remove: {
            name: "Remove Quality",
            description: "Ignore and discard Quality",
        }
    },
    testCasesGeneration: {
        request: {
            name: "Request Generate Test Cases Data",
            description: "Create Test Cases data for requirements",
        },  
        update: {
            name: "Create Test Cases and link to ETM",
            description: "Save the test cases to actual data in ETM and links to requirements",
        },
        remove: {
            name: "Discard Generated Test Cases Data",
            description: "Ignore and discard data of Test Cases",
        }
    }
}   

Object.freeze(IBM_XML_TAG_NAMES)
Object.freeze(IBM_XML_TAG_ATTRS)
Object.freeze(company_RM_ARTIFACT_TYPE_URIS)
Object.freeze(company_RM_ATTR_TYPE_URIS)
Object.freeze(company_TESTCASES_ATTRS)
Object.freeze(JAZZ_LINK_SERVICE_TRACE_LINKS)
Object.freeze(EVENT_LOG_TYPE)
Object.freeze(STATS_WIDGET_ACTIONS)

export { STATS_WIDGET_ACTIONS, LOCAL_STORAGE_CLIENT_ID_KEY, PRECONDITION_MESSAGES, REQ_PER_TIME, IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS, STRING_DATA_TYPE_RDF_URI, ATTRIBUTE_TAG_NAME, ARTIFACT_TYPE_TAG_NAME, TRANSLATE_ATTR_NAME, TOXIC_ATTR_NAME, QUALITY_ATTR_NAME, CONSISTENCY_ATTR_NAME, ATTR_RDF_URI_DOMAIN, NO_VIEW_STRING, EVENT_LOG_TYPE, BOUND_ARTIFACT_OBJ, LOCAL_STORAGE_KEY, company_RM_ATTR_TYPE_URIS, company_RM_ARTIFACT_TYPE_URIS, company_TESTCASES_ATTRS, JAZZ_LINK_SERVICE_TRACE_LINKS }
