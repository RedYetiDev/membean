import got from 'got';
import * as Cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { EventEmitter } from 'events';
import * as Utilities from './utils.js';


///// TYPES /////

/**
 * @typedef {"new_word" | "restudy" | "quiz" | "spelltest" | "take_a_break"} MembeanState The type of state
 */

/**
 * @typedef {Object} MembeanWordLearnExample The example data
 * @property {String} text The example text
 * @property {String} attribution The example attribution
 */

/**
 * @typedef {Object} MembeanWordLearnRelated The related words
 * @property {String} word The word
 * @property {String} definition The definition
 */

/**
 * @typedef {Object} MembeanWordLearnPart The word part data
 * @property {String} part The part of the word
 * @property {String} meaning The meaning of the part
 */

/**
 * @typedef {Object} MembeanWordLearnState The parsed word learn data
 * @template {"new_word" | "restudy"} T
 * @property {T} type The type of word learn
 * @property {{ todo }} nav The navigation data
 * 
 * @property {String} partOfSpeech The part of speech
 * @property {String} level The level
 * @property {String} word The word
 * @property {String} orthoepy The orthoepy
 * @property {String} pronounciation The pronounciation
 * @property {String} image The image
 * 
 * @property {Object} context The context
 * @property {String} context.exampleSentence The example sentence
 * @property {Object} context.quiz The quiz
 * @property {String} context.quiz.question The question
 * @property {String} context.quiz.answer The answer
 * @property {String[]} context.quiz.choices The choices
 * @property {String} context.definition The definition
 * @property {String} context.quickLook The quick look
 * 
 * @property {MembeanWordLearnExample[]} examples The examples
 * 
 * @property {Object} wordStructure The word structure
 * @property {String} wordStructure.definition The definition
 * @property {MembeanWordLearnPart[]} wordStructure.parts The parts
 * 
 * @property {Object} related The related words
 * @property {MembeanWordLearnRelated[]} related.synonyms The synonyms
 * @property {MembeanWordLearnRelated[]} related.antonyms The antonyms
 * 
 * @property {T extends "new_word" ? MembeanNavigator : never} ikt The IKT
 */

/**
 * @typedef {Object} MembeanQuizState The parsed quiz data
 * @property {"quiz"} type The type of state
 * @property {{ todo }} nav The navigation data
 * @property {Object} clock The clock
 * @property {String} clock.elapsed The elapsed time
 * @property {String} clock.total The total time
 * @property {Object} answer The answer
 * @property {MembeanNavigator} answer.pass The pass navigator
 * @property {MembeanNavigator} answer.fail The fail navigator
 * @todo actual question part (because it differs per question)
*/

/**
 * @typedef {Object} MembeanSpellTestState The parsed spell check data
 * @property {"spelltest"} type The type of state
 * @property {{ todo }} nav The navigation data
 * @property {Object} answer The answer
 * @property {MembeanNavigator} answer.pass The pass navigator
 * @property {MembeanNavigator} answer.fail The fail navigator
 * @todo actual question part (because it differs per question)
*/

///// CLASSES /////
/**
 * The MemBean client API
 * @class
 * @author Aviv Keller <redyetidev@gmail.com>
 */
class MemBeanTrainingSession extends EventEmitter {
    ///// EVENTS /////
    /**
     * Emitted on a 'new_word' state
     * @event MemBeanTrainingSession#new_word
     * @type {MembeanWordLearnState<"new_word">}
     * @example session.on('new_word', (data) => console.log(data));
     */

    /**
     * Emitted on a 'restudy' state
     * @event MemBeanTrainingSession#restudy
     * @type {MembeanWordLearnState<"restudy">}
     * @example session.on('restudy', (data) => console.log(data));
    */

    /**
     * Emitted on a 'quiz' state
     * @event MemBeanTrainingSession#quiz
     * @type {MembeanQuizState}
     * @example session.on('quiz', (data) => console.log(data));
    */

    /**
     * Emitted on a 'spelltest' state
     * @event MemBeanTrainingSession#spelltest
     * @type {MembeanSpellTestState}
     * @example session.on('spelltest', (data) => console.log(data));
    */

    /**
     * Emitted on a 'take_a_break' state
     * @event MemBeanTrainingSession#take_a_break
     * @type {null}
     * @example session.on('take_a_break', () => console.log('done'));
    */

    ///// METHODS /////
    
    
    /**
     * Advances the training session
     * @param {TODO TYPE} advancement The internal advancement object (TODO EXPLAIN)
     * @param {Number} [timeOnPage=5] The time spent on the page, in seconds
     * @returns {Promise<void>}
     * @example await session.advance(<TODO>, 5);
     */
    async advance(advancement, timeOnPage = 5) {
        await this._int_advance(advancement.event, advancement.barrier, {
            ...advancement,
            "time-on-page": JSON.stringify({ time: timeOnPage })
        });

        await this.parseUserState();
    }

    /**
     * (INTERNAL USE ONLY) Advances the training session internally
     * @param {TODO TYPE} event (INTERNAL USE ONLY) The event data
     * @param {String} barrier (INTERNAL USE ONLY) The barrier token
     * @param {TODO TYPE} args  (INTERNAL USE ONLY) The arguments
     * @returns {Promise<void>}
     * @private
     */
    async _int_advance(event, barrier, args) {
        return await this.got.post(`https://membean.com/training_sessions/${this.id}/advance`, {
            body: Utilities.buildForm({
                event,
                barrier,
                id: this.id,
                ...args,
                it: 0,
                more_ts: "ostentatious"
            })
        });
    }

    /**
     * Parses the user state
     * @returns {Promise<void>}
     * @example await session.parseUserState();
     */
    async parseUserState() {
        const res = await this.got.get(`https://membean.com/training_sessions/${this.id}/user_state?xhr=_xhr`).text();
        await this._parseUserState(res);
    }

    /**
     * (INTERNAL USE ONLY) Parses the user state
     * @param {TODO TYPE} res (INTERNAL USE ONLY) The response from parsing the user state
     * @returns {Promise<void>}
     * @private
     */
    async _parseUserState(res) {
        if (Utilities.isJSON(res)) {
            const json = JSON.parse(res);
            this.emit('redirect', json.redirect_url);
        } else {
            const $ = Cheerio.load(res);
            let state = $('#session-state').data('state');
            let object;
            switch (state) {
                case 'new_word':
                case 'restudy':
                    object = this.parseWordLearn($, state);
                    break;
                case 'quiz':
                    object = this.parseQuiz($);
                    break;
                case 'spelltest':
                    object = await this.parseSpellCheck($);
                    break;
                case 'take_a_break':
                    object = this.parseTakeABreak($);
                    break;
                default:
                    throw new Error(`Unknown state: ${state}`);
            }
            this.emit(state, object);
        }
    }

    /**
     * Parses the word learn data from the user state
     * @param {cheerio.Cheerio} $ The Cheerio instance
     * @param {"new_word" | "restudy"} type The type of word learn, for the emitter
     * @returns {MembeanWordLearnState<"new_word" | "restudy">} The parsed word learn data
     */
    parseWordLearn($, type) {
        const object = {
            type,
            nav: Utilities.parseNavigation($),
        };

        let wordInfo = $("#misc-word-info").children().map((_, el) => $(el)).get();

        object.partOfSpeech = wordInfo[0].text().trim();
        object.level = wordInfo[1].text().trim().replace(/\n+\s+/g, " - ").trim();
        object.word = $(".wordform").text().trim();
        object.orthoepy = $("#orthoepy").text().trim();
        object.pronounciation = $("#pronounce-sound").attr("path");
        object.image = $("#bk-img").attr("src");

        object.context = {};
        object.context.exampleSentence = Utilities.removeExtraSpacing($("#context-paragraph").text().trim());
        object.context.quiz = {};
        object.context.quiz.question = Utilities.removeExtraSpacing($(".question").clone().children('span').remove().end().text().trim()).split(": ")[1];
        object.context.quiz.answer = $(".answer").text().trim();
        object.context.quiz.choices = $(".choice").map((_, el) => $(el).text().trim()).get();
        object.context.definition = Utilities.removeExtraSpacing($(".def-text").text().trim());
        object.context.quickLook = Utilities.removeExtraSpacing($(".one-word-tab-right").text().trim());

        object.examples = $("#examples > .content > ul > li").map((_, el) => {
            let $el = $(el);
            let text = Utilities.removeExtraSpacing($el.clone().children('.attribution').remove().end().text().trim());
            let attribution = $el.children('.attribution').text().trim().replace(/—/g, "").trim();

            return { text, attribution };
        }).get();

        object.wordStructure = {};
        object.wordStructure.definition = Utilities.removeExtraSpacing($("#word-structure > .content > p").text().trim());
        object.wordStructure.parts = $("#word-structure > .content > table > tbody > tr").map((_, el) => {
            let $el = $(el);
            let part = $el.children('td').first().text().trim();
            let meaning = $el.find('td.meaning').text().trim();
            return { part, meaning };
        }).get();

        object.related = {
            synonyms: $("#related-words > .content > .related-syns").children().map((_, el) => {
                let $el = $(el);
                let idx = $el.data('idx');
                let def = Utilities.removeExtraSpacing($(`.rw-defn idx${idx}`).text().trim());
                let word = $el.find('span').text().trim();

                return { word, definition: def };
            }).get(),
            antonyms: $("#related-words > .content > .related-ants").children().map((_, el) => {
                let $el = $(el);
                let idx = $el.data('idx');
                let def = Utilities.removeExtraSpacing($(`.rw-defn.idx${idx}`).text().trim());
                let word = $el.find('span').text().trim();

                return { word, definition: def };
            }).get(),
        };

        if (type === 'new_word') {
            object.ikt = Utilities.parseNavigator($("#word-flags > span > form"))[1];
        }

        return object;
    }

    /**
     * Parses the quiz data from the user state
     * @param {cheerio.Cheerio} $ The Cheerio instance
     * @returns {MembeanQuizState} The parsed quiz data
     */
    parseQuiz($) {
        const object = {
            type: "quiz",
            nav: Utilities.parseNavigation($),
        };

        object.clock = {};
        let [elapsed, total] = $("#training-clock-stats").children(".large").map((_, el) => $(el).text().trim()).get();
        object.clock.elapsed = elapsed;
        object.clock.total = total;

        // TODO: actual question part (because it differs per question)
        // types:
        // - Multiple Choice
        //     - From Text
        //     - From Image
        // - Fill in the Blank

        object.answer = {};
        object.answer.pass = Utilities.parseNavigator($("form[name='Pass']"))[1];
        object.answer.fail = Utilities.parseNavigator($("form[name='Fail']"))[1];

        return object;
    }

    /**
     * Parses the spell check data from the user state
     * @param {cheerio.Cheerio} $ The Cheerio instance
     * @returns {MembeanSpellTestState} The parsed spell check data
     */
    parseSpellCheck($) {
        const object = {
            type: "spelltest",
            nav: Utilities.parseNavigation($),
        };

        object.answer = {};
        object.answer.pass = Utilities.parseNavigator($("form[name='Pass']"))[1];
        object.answer.fail = Utilities.parseNavigator($("form[name='Fail']"))[1];

        return object;
    }

    /**
     * Parses the take a break data from the user state, and terminates the session
     * @param {cheerio.Cheerio} $ The Cheerio instance
     * @returns {{type: "done"}} The parsed take a break data
    */
    async parseTakeABreak($) {
        let { barrier } = Utilities.parseFormToJSON($("form"));
        await this._int_advance('close!', barrier);
        return { type: "done" };
    }

    /**
     * Begins the training session
     * @param {Number} id The training session ID
     * @param {String} auth The authentication token
     * @constructor
     */
    constructor(id, auth) {
        super();
        this.cookieJar = new CookieJar();
        this.id = id;
        this.got = got.extend({
            cookieJar: this.cookieJar,
            hooks: {
                beforeRequest: [
                    options => {
                        console.log(`Requesting ${options.url.href}`);
                    }
                ]
            },
            followRedirect: false
        });
        this.cookieJar.setCookie(`auth_token=${auth}`, 'https://membean.com');
    }
}

export default MemBeanTrainingSession;
