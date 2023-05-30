export const SauceAPIGQL = `#graphql
    """
    Possible matching image sauce
    """
    type SauceObject {
        "The image name, dependes on the source"
        title: String!
        "The source url"
        source: String!
        "How similar the match are"
        confidence: Similarity!
        "The thumbnail for the match"
        thumbnail: String!
        "Extra info that might be omitted, for example: Episode and time of the image"
        extra_info: JSON
        "Indexer used for the image"
        indexer: String
    }

    """
    The sauce results of the provided image
    """
    type SauceResource {
        "Total matches"
        _total: Int!
        "Collection or a list of closest-matching sauce"
        items: [SauceObject!]
    }
`;

export interface SauceObject {
    title: string;
    source: string;
    confidence: number;
    thumbnail: string;
    extra_info?: object;
    indexer?: string;
}

export interface SauceResource {
    _total: number;
    items: SauceObject[];
}

interface Input {
    url: string;
}

export interface SauceNAOParams extends Input {
    minsim: number;
    limit?: number;
    db_index?: number;
}

export interface IQDBParams extends Input {
    minsim: number;
    limit: number;
}

export interface ASCII2DParams extends Input {
    limit?: number;
}
