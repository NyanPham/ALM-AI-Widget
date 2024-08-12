export const VALUE_TYPES_MAP = new Map([
    ['integer', 'http://www.w3.org/2001/XMLSchema#int'],
    ['float', 'http://www.w3.org/2001/XMLSchema#float'],
    ['boolean', 'http://www.w3.org/2001/XMLSchema#boolean'],
    ['date', 'http://www.w3.org/2001/XMLSchema#date'],
    ['time', 'http://www.w3.org/2001/XMLSchema#time'],
    ['date time', 'http://www.w3.org/2001/XMLSchema#dateTime'],
    ['string', 'http://www.w3.org/2001/XMLSchema#string'],
    ['duration', 'http://www.w3.org/2001/XMLSchema#duration'],
    ['user', 'http://www.ibm.com/xmlns/rdm/types/UserAttributeType'],
]);

export const ACCEPTED_VALUE_TYPES_MAP = new Map([
    ['simple', ['integer', 'float', 'boolean', 'date', 'time', 'date time', 'string', 'duration', 'user']],
    ['enum', ['integer']],
    ['range', ['integer', 'float', 'date', 'date time']],
]);