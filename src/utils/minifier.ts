import Minifier, { Options as MinifierOptions } from "html-minifier";
import express from "express";

type MinifierURLException = string | Function | RegExp | boolean | undefined;

export interface IExpressMinifier {
    override?: boolean;
    exception_url?: boolean | MinifierURLException[];
    htmlMinifier?: MinifierOptions;
}

export default function minifyHTML(opts: IExpressMinifier = {}): express.RequestHandler {
    const default_opts = {
        override: false,
        exception_url: false,
        htmlMinifier: {
            removeComments: true,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeEmptyAttributes: true,
        },
    };

    opts = Object.assign({}, default_opts, opts);

    if (!Array.isArray(opts.exception_url)) {
        opts.exception_url = [opts.exception_url];
    }

    function minifier(req: express.Request, res: express.Response, next: any) {
        // eslint-disable-next-line no-var
        var skip = false;

        // @ts-ignore
        opts.exception_url.every((e) => {
            switch (true) {
                case e.constructor === RegExp:
                    skip = e.test(req.url);
                    break;
                case e.constructor === Function:
                    skip = e(req, res) || false;
                    break;
                case e.constructor === String:
                    skip = req.url.match(e) ? true : false;
                    break;
                default:
            }

            return !skip;
        });

        const sendMinified = function (callback?: Function) {
            if (typeof callback === "undefined") {
                return function (err: any, html: string) {
                    if (err) {
                        next(err);
                    }

                    try {
                        html = Minifier.minify(html, opts.htmlMinifier);
                    } catch (err) {
                        res.status(500).send(err);
                    }

                    res.setHeader("X-Minified", 1);
                    res.send(html);
                };
            } else {
                return function (err: any, html?: string) {
                    try {
                        if (html) {
                            html = Minifier.minify(html, opts.htmlMinifier);
                        }

                        callback(err, html);
                    } catch (err) {
                        callback(err, html);
                    }
                };
            }
        };

        // @ts-ignore
        res.renderMin = function (view: string, renderOpts: object | undefined, cb: Function | undefined) {
            this.render(view, renderOpts, sendMinified(cb));
        };

        if (opts.override && !skip) {
            // @ts-ignore
            res.oldRender = res.render;
            // @ts-ignore
            res.render = function (view: any, renderOpts: any, cb: Function | undefined) {
                // @ts-ignore
                this.oldRender(view, renderOpts, sendMinified(cb));
            };
        }
        return next();
    }

    return minifier;
}
