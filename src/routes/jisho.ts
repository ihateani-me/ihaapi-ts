import express from "express";
import { cleanRomaji, fromKana } from "hepburn";
import jishoAPI, { Result as ExampleResult, YomiExample } from "unofficial-jisho-api";

const JishoRoutes = express.Router();
const Jisho = new jishoAPI();

interface ReparsedYomiExamples {
    word: string;
    reading: string;
    meaning: string;
    romaji: string;
}

interface ReparsedYomi {
    word: string;
    romaji: string;
}

function toHepburn(kana: string): string {
    const romanized = fromKana(kana);
    return cleanRomaji(romanized).toLowerCase();
}

function reparseYomi(yomis: string[], examples: YomiExample[]) {
    const reparsedYomi: ReparsedYomi[] = [];
    yomis.forEach((yomi) => {
        const hepburn = toHepburn(yomi);
        reparsedYomi.push({
            word: yomi,
            romaji: hepburn,
        });
    });
    const reparsedExamples: ReparsedYomiExamples[] = [];
    examples.forEach((example) => {
        const word = example["example"];
        const reading = example["reading"];
        const romaji = toHepburn(reading);
        const meaning = example["meaning"];
        reparsedExamples.push({
            word: word,
            reading: reading,
            romaji: romaji,
            meaning: meaning,
        });
    });
    return { words: reparsedYomi, examples: reparsedExamples };
}

/**
 * @swagger
 * /jisho/kanji/{kanji}:
 *  get:
 *      summary: Get Kanji Information from Jisho
 *      description: This will fetch information regarding the provided kanji to Jisho.
 *      tags:
 *      - jisho_api
 *      parameters:
 *      - in: path
 *        name: kanji
 *        description: Kanji to search or find.
 *        required: true
 *        schema:
 *          type: string
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/v1/jisho/kanji/常").json()
 *           print(res)
 *      responses:
 *          '200':
 *              description: Kanji Information.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          required: ["code", "data"]
 *                          properties:
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                              data:
 *                                  type: object
 *                                  description: The kanji information
 *                                  required: ["jlpt", "taughtIn", "strokes", "meanings", "kunyomi", "onyomi", "radical", "parts"]
 *                                  properties:
 *                                     jlpt:
 *                                         type: string
 *                                         description: JLPT Level of the Kanji
 *                                         enum: ["N1", "N2", "N3", "N4", "N5"]
 *                                     taughtIn:
 *                                         type: string
 *                                         description: The class grade of the kanji is taught.
 *                                     meanings:
 *                                         type: array
 *                                         description: A list of meanings of the kanji
 *                                         items:
 *                                             type: string
 *                                             description: Kanji meaning
 *                                     kunyomi:
 *                                         type: object
 *                                         description: Kanji reading in kunyomi styles
 *                                         properties:
 *                                             words:
 *                                                 type: array
 *                                                 description: Array of the kunyomi reading.
 *                                                 items:
 *                                                     type: object
 *                                                     description: The reading of the kanji in kunyomi
 *                                                     required: ["word", "romaji"]
 *                                                     properties:
 *                                                         word:
 *                                                             type: string
 *                                                             description: The reading in kana
 *                                                         romaji:
 *                                                             type: string
 *                                                             description: Romanized version of the reading, this is in hepburn format.
 *                                             examples:
 *                                                 type: array
 *                                                 description: Examples of the writing.
 *                                                 items:
 *                                                     type: object
 *                                                     description: Example of the reading in kunyomi
 *                                                     required: ["word", "reading", "romaji", "meaning"]
 *                                                     properties:
 *                                                         word:
 *                                                             type: string
 *                                                             description: The kanji itself.
 *                                                         reading:
 *                                                             type: string
 *                                                             description: The reading in kana
 *                                                         romaji:
 *                                                             type: string
 *                                                             description: Romanized version of the reading, this is in hepburn format.
 *                                                         meaning:
 *                                                             type: string
 *                                                             description: The meaning of the example.
 *                                     onyomi:
 *                                         type: object
 *                                         description: Kanji reading in onyomi styles
 *                                         properties:
 *                                             words:
 *                                                 type: array
 *                                                 description: Array of the onyomi reading.
 *                                                 items:
 *                                                     type: object
 *                                                     description: The reading of the kanji in onyomi
 *                                                     required: ["word", "romaji"]
 *                                                     properties:
 *                                                         word:
 *                                                             type: string
 *                                                             description: The reading in kana
 *                                                         romaji:
 *                                                             type: string
 *                                                             description: Romanized version of the reading, this is in hepburn format.
 *                                             examples:
 *                                                 type: array
 *                                                 description: Examples of the writing.
 *                                                 items:
 *                                                     type: object
 *                                                     description: Example of the reading in onyomi
 *                                                     required: ["word", "reading", "romaji", "meaning"]
 *                                                     properties:
 *                                                         word:
 *                                                             type: string
 *                                                             description: The kanji itself.
 *                                                         reading:
 *                                                             type: string
 *                                                             description: The reading in kana
 *                                                         romaji:
 *                                                             type: string
 *                                                             description: Romanized version of the reading, this is in hepburn format.
 *                                                         meaning:
 *                                                             type: string
 *                                                             description: The meaning of the example.
 *                                     radical:
 *                                         type: object
 *                                         description: Radical (building block) of the kanji
 *                                         properties:
 *                                             symbol:
 *                                                 type: string
 *                                                 description: The radical symbol.
 *                                             meaning:
 *                                                 type: string
 *                                                 description: Meaning of the radical
 *                                     parts:
 *                                         type: array
 *                                         description: A list of the kanji parts to write the kanji itself.
 *                                         items:
 *                                             type: string
 *                                             description: Kanji part
 *                                     strokes:
 *                                         type: object
 *                                         description: Stroke information of the kanji
 *                                         required: ["count", "gif", "diagram"]
 *                                         properties:
 *                                             count:
 *                                                 type: number
 *                                                 description: Total strokes for the kanji
 *                                             gif:
 *                                                 type: string
 *                                                 description: The strokes order in gif image format.
 *                                             diagram:
 *                                                 type: string
 *                                                 description: The stroke order diagram.
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              data:
 *                                  type: object
 *                                  description: Empty object
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
JishoRoutes.get("/kanji/:kanji", async (req, res) => {
    const result = await Jisho.searchForKanji(req.params.kanji);
    const kanjiCode = req.params.kanji.charCodeAt(0).toString();
    if (result.found) {
        res.json({
            code: 200,
            data: {
                jlpt: result.jlptLevel,
                taughtIn: result.taughtIn,
                strokes: {
                    count: result.strokeCount,
                    gif: result.strokeOrderGifUri,
                    diagram: `https://www.tanoshiijapanese.com/images/standard/j/${kanjiCode}.png`,
                },
                meanings: result.meaning.split(", "),
                kunyomi: reparseYomi(result.kunyomi, result.kunyomiExamples),
                onyomi: reparseYomi(result.onyomi, result.onyomiExamples),
                radical: result.radical,
                parts: result.parts,
            },
        });
    } else {
        res.status(404).json({
            code: 404,
            data: {},
        });
    }
});

interface ReparsedExamples {
    sentences: string;
    reading: string;
    meaning: string;
    romaji: string;
}

function reparseExamplesSearch(examples: ExampleResult[]) {
    const reparsedExamples: ReparsedExamples[] = [];
    examples.forEach((res) => {
        const romaji = toHepburn(res.kana);
        reparsedExamples.push({
            sentences: res.kanji,
            reading: res.kana,
            meaning: res.english,
            romaji: romaji,
        });
    });
    return reparsedExamples;
}

/**
 * @swagger
 * /jisho/examples/{word}:
 *  get:
 *      summary: Get Sentences Examples from Jisho
 *      description: This will fetch sentences examples regarding the provided kanji/word/sentences to Jisho.
 *      tags:
 *      - jisho_api
 *      parameters:
 *      - in: path
 *        name: word
 *        description: Word or sentences to search.
 *        required: true
 *        schema:
 *          type: string
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/v1/jisho/examples/うち").json()
 *           print(res)
 *      responses:
 *          '200':
 *              description: Returns a matching examples that fits within the word confines.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          required: ["code", "data"]
 *                          properties:
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                              data:
 *                                  type: array
 *                                  description: A list of Sentences examples
 *                                  items:
 *                                     type: object
 *                                     description: Sentences example
 *                                     required: ["sentences", "reading", "meaning", "romaji"]
 *                                     properties:
 *                                        sentences:
 *                                            type: string
 *                                            description: The sentences example.
 *                                        reading:
 *                                            type: string
 *                                            description: The kana reading of the sentences.
 *                                        meaning:
 *                                            type: string
 *                                            description: The sentences meaning in english.
 *                                        romaji:
 *                                            type: string
 *                                            description: The romanized version of the reading.
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              data:
 *                                  type: object
 *                                  description: Empty object
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
JishoRoutes.get("/examples/:word", async (req, res) => {
    const result = await Jisho.searchForExamples(req.params.word);
    if (result.found) {
        res.json({
            code: 200,
            data: reparseExamplesSearch(result.results),
        });
    } else {
        res.json({
            code: 404,
            data: [],
        });
    }
});

export { JishoRoutes };
