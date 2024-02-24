import got from 'got';
import * as Cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { EventEmitter } from 'events';

/**
 * Checks if a given string is valid JSON.
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string is valid JSON, otherwise false.
 */
const isJSON = str => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Maps special characters to their standardized equivalents.
 * @type {Object.<string, string>}
 */
const specialCharsMap = {
    // EN DASH / HYPHEN (U+002D)
    '\u1806': '\u002D', // '᠆'
    '\u2010': '\u002D', // '‐'
    '\u2011': '\u002D', // '‑'
    '\u2012': '\u002D', // '‒'
    '\u2013': '\u002D', // '–'
    '\uFE58': '\u002D', // '﹘'
    '\uFE63': '\u002D', // '﹣'
    '\uFF0D': '\u002D', // '－'

    // SINGLE QUOTES (U+0027)
    '\u003C': '\u0027', // '<'
    '\u003E': '\u0027', // '>'
    '\u2018': '\u0027', // '‘'
    '\u2019': '\u0027', // '’'
    '\u201A': '\u0027', // '‚'
    '\u201B': '\u0027', // '‛'
    '\u2039': '\u0027', // '‹'
    '\u203A': '\u0027', // '›'
    '\u275B': '\u0027', // '❛'
    '\u275C': '\u0027', // '❜'
    '\u276E': '\u0027', // '❮'
    '\u276F': '\u0027', // '❯'
    '\uFF07': '\u0027', // '＇'
    '\u300C': '\u0027', // '「'
    '\u300D': '\u0027', // '」'

    // DOUBLE QUOTES (U+0022)
    '\u00AB': '\u0022', // '«'
    '\u00BB': '\u0022', // '»'
    '\u201C': '\u0022', // '“'
    '\u201D': '\u0022', // '”'
    '\u201E': '\u0022', // '„'
    '\u201F': '\u0022', // '‟'
    '\u275D': '\u0022', // '❝'
    '\u275E': '\u0022', // '❞'
    '\u2E42': '\u0022', // '⹂'
    '\u301D': '\u0022', // '〝'
    '\u301E': '\u0022', // '〞'
    '\u301F': '\u0022', // '〟'
    '\uFF02': '\u0022', // '＂'
    '\u300E': '\u0022', // '『'
    '\u300F': '\u0022', // '』'
};

/**
 * Normalizes non-standard quotes and dashes into a uniform format.
 * @param {string} query - The string to sanitize.
 * @returns {string} - The sanitized string.
 */
const sanitizeString = (query) => {
    return Object.entries(specialCharsMap).reduce((acc, [char, stdChar]) => {
        return acc.replaceAll(char, stdChar);
    }, query);
};

/**
 * Removes extra spacing from a string.
 * @param {string} str - The string to process.
 * @returns {string} - The string without extra spacing.
 */
const removeExtraSpacing = str => str.replace(/\s+/g, ' ').trim();

/**
 * Represents an AutoBean object.
 * @extends EventEmitter
 */
class MemBean extends EventEmitter {
    /**
     * Advances the training session.
     * @param {string} id - The ID of the training session.
     * @param {object} advancement - The advancement details.
     * @param {number} [timeOnPage=5] - The time spent on the page.
     * @returns {Promise<void>}
     */
    async advance(id, advancement, timeOnPage = 5) {
        await this._int_advance(id, advancement.event, advancement.barrier, {
            ...advancement,
            "time-on-page": JSON.stringify({ time: timeOnPage })
        });

        await this.parseUserState(id);
    }

    /**
     * Internal method to advance the training session.
     * @param {string} id - The ID of the training session.
     * @param {string} event - The event.
     * @param {string} barrier - The barrier.
     * @param {object} args - Additional arguments.
     * @returns {Promise<any>}
     * @private
     */
    async _int_advance(id, event, barrier, args) {
        return await this.got.post(`https://membean.com/training_sessions/${id}/advance`, {
            body: this.buildForm({
                event,
                barrier,
                id,
                ...args,
                it: 0,
                more_ts: "ostentatious"
            })
        });
    }

    /**
     * Builds form data.
     * @param {object} data - The form data.
     * @returns {string} - The encoded form data.
     */
    buildForm(data) {
        return Object.entries(data).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
    }

    /**
     * Parses user state.
     * @param {string} id - The ID of the training session.
     * @returns {Promise<void>}
     */
    async parseUserState(id) {
        const res = await this.got.get(`https://membean.com/training_sessions/${id}/user_state?xhr=_xhr`).text();
        await this._parseUserState(res);
    }

    /**
     * Internal method to parse user state.
     * @param {string} res - The response to parse.
     * @returns {Promise<void>}
     * @private
     */
    async _parseUserState(res) {
        if (isJSON(res)) {
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
     * Parses a navigator element to JSON.
     * @param {jQuery} el - The navigator element.
     * @returns {[string, Object]} - A tuple containing the name and JSON data of the navigator.
     */
    parseNavigator(el) {
        let json = parseFormToJSON(el);
        return [sanitizeString(el.attr('name')), json];
    }

    /**
     * Parses navigation elements.
     * @param {jQuery} $ - jQuery object.
     * @returns {Object} - The parsed navigation data.
     */
    parseNavigation($) {
        /**
         * Parse navigator callback.
         * @param {number} _ - Index.
         * @param {Element} el - Current element.
         * @returns {[string, Object]} - A tuple containing the name and JSON data of the navigator.
         */
        function parseNavCallback(_, el) {
            return [parseNavigator($(el))];
        }

        let nav = $("#trainer-nav").children().map(parseNavCallback.bind(this)).get();
        return Object.fromEntries(nav);
    }


    /**
     * Parses word learning data.
     * @param {import('cheerio').CheerioAPI} $ - The Cheerio instance.
     * @param {string} type - The type of word (e.g., 'new_word').
     * @returns {Object} - The parsed word learning data.
     */
    parseWordLearn($, type) {
        const object = {
            type,
            nav: parseNavigation($),
        };

        let wordInfo = $("#misc-word-info").children().map((_, el) => $(el)).get();

        object.partOfSpeech = wordInfo[0].text().trim();
        object.level = wordInfo[1].text().trim().replace(/\n+\s+/g, " - ").trim();
        object.word = $(".wordform").text().trim();
        object.orthoepy = $("#orthoepy").text().trim();
        object.pronounciation = $("#pronounce-sound").attr("path");
        object.image = $("#bk-img").attr("src");

        object.context = {};
        object.context.exampleSentence = removeExtraSpacing($("#context-paragraph").text().trim());
        object.context.quiz = {};
        object.context.quiz.question = removeExtraSpacing($(".question").clone().children('span').remove().end().text().trim()).split(": ")[1];
        object.context.quiz.answer = $(".answer").text().trim();
        object.context.quiz.choices = $(".choice").map((_, el) => $(el).text().trim()).get();
        object.context.definition = removeExtraSpacing($(".def-text").text().trim());
        object.context.quickLook = removeExtraSpacing($(".one-word-tab-right").text().trim());

        object.examples = $("#examples > .content > ul > li").map((_, el) => {
            let $el = $(el);
            let text = removeExtraSpacing($el.clone().children('.attribution').remove().end().text().trim());
            let attribution = $el.children('.attribution').text().trim().replace(/—/g, "").trim();

            return { text, attribution };
        }).get();

        object.wordStructure = {};
        object.wordStructure.definition = removeExtraSpacing($("#word-structure > .content > p").text().trim());
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
                let def = removeExtraSpacing($(`.rw-defn idx${idx}`).text().trim());
                let word = $el.find('span').text().trim();

                return { word, definition: def };
            }).get(),
            antonyms: $("#related-words > .content > .related-ants").children().map((_, el) => {
                let $el = $(el);
                let idx = $el.data('idx');
                let def = removeExtraSpacing($(`.rw-defn.idx${idx}`).text().trim());
                let word = $el.find('span').text().trim();

                return { word, definition: def };
            }).get(),
        };

        if (type === 'new_word') {
            object.ikt = parseNavigator($("#word-flags > span > form"))[1];
        }

        return object;
    }


    /**
     * Converts form data to JSON.
     * @param {import('cheerio').CheerioAPI} $ - The Cheerio instance.
     * @returns {Object} - The JSON data representing the form.
     */
    parseFormToJSON($) {
        let data = {};
        $.serializeArray().forEach((obj) => {
            data[obj.name] = obj.value;
        });
        return data;
    }

    /**
     * Parses quiz data.
     * @param {import('cheerio').CheerioAPI} $ - The Cheerio instance.
     * @returns {Object} - The parsed quiz data.
     */
    parseQuiz($) {
        const object = {
            type: "quiz",
            nav: parseNavigation($),
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
        object.answer.pass = parseNavigator($("form[name='Pass']"))[1];
        object.answer.fail = parseNavigator($("form[name='Fail']"))[1];

        return object;
    }

    /**
     * Asynchronously parses spell check data.
     * @param {import('cheerio').CheerioAPI} $ - The Cheerio instance.
     * @returns {Promise<Object>} - A promise resolving to the parsed spell check data.
     */
    async parseSpellCheck($) {
        const object = {
            type: "spelltest",
            nav: parseNavigation($),
        };

        object.answer = {};
        object.answer.pass = parseNavigator($("form[name='Pass']"))[1];
        object.answer.fail = parseNavigator($("form[name='Fail']"))[1];

        return object;
    }

    /**
     * Parses take a break data.
     * @param {import('cheerio').CheerioAPI} $ - The Cheerio instance.
     * @returns {Promise<Object>} - A promise resolving to the parsed take a break data.
     */
    async parseTakeABreak($) {
        let { barrier } = parseFormToJSON($("form"));
        await this._int_advance(id, 'close!', barrier);
        return { type: "done" };
    }



    /**
     * Constructs an AutoBean object.
     * @param {string} auth - The authentication token.
     */
    constructor(auth) {
        super();
        this.cookieJar = new CookieJar();
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

export default MemBean;