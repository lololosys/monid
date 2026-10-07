import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobsPipeJobSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/jobs/search` — filter search over the live corpus, one credit
 * per posting returned.
 *
 * `limit` is REQUIRED at the binding (design D25 — the mirror stays the
 * faithful vendor contract, optional with vendor default 25): it is the
 * estimate's whole basis, so the caller states the cap. The bill itself is
 * the vendor's `metadata.credits_charged` claim (provider consolidate),
 * which is at most the row count and less when rows were already paid for
 * this month.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Jobs",
        summary: "Search live job postings with structured filters.",
        description: "Search live job postings from 30+ job boards, " +
            "employment services and company career sites, normalized " +
            "into one schema. Every filter is optional and they combine " +
            "with AND; array filters ending in _or match any value, _not " +
            "exclude. Filter by title or description phrases, country, " +
            "city or region, US metro, remote / hybrid / onsite, seniority, " +
            "employment type, posting language, source board, skills or " +
            "ESCO skill ids, ISCO occupation and ISIC industry codes, " +
            "company name, headcount, revenue or technologies used, visa " +
            "stance, benefits, applicant count, recruiter email presence, " +
            "posted salary in USD, ghost-job score, posting date and the " +
            "date JobsPipe first discovered it (poll discovered_at_gte " +
            "with your last run time for only-new postings). Each posting " +
            "returns title, company with domain, location, arrangement, " +
            "seniority, annualized salary, skills, occupation and " +
            "industry codes, status and the source URL. Pages via " +
            "metadata.next_cursor. Unknown filter names are rejected, not " +
            "ignored. Reach for jobspipe#v1/jobs/agentic-search when you " +
            "have a sentence rather than filters, and " +
            "jobspipe#v1/companies/{key} for the full record of one " +
            "employer. One credit per posting returned; a posting this " +
            "account already paid for this month is free; an empty " +
            "result costs nothing.",
        docsUrl: "https://docs.jobspipe.dev/api-reference/jobs-search",
        categories: ["jobs"],
        notes: [
            "Only [{field: 'posted_at', desc: true}] is accepted in " +
            "order_by — every response is already newest-first; any " +
            "other sort is a 400.",
            "employment_type_or, job_seniority_or and work_arrangement_or " +
            "drop postings whose value is unknown (27%, 55% and a " +
            "sizeable share respectively); add the field to " +
            "include_unknown to keep them.",
            "metadata.total_results is null unless include_total_results " +
            "is set; counting is extra latency, not extra credits.",
        ],
    },
    request: { method: "POST", path: "/v1/jobs/search" },
    input: {
        schema: { body: zJobsPipeJobSearchBody.required({ limit: true }) },
    },
    usage: {
        /** "One credit is one job returned" — from the provider's single
         *  pool. Settle is inherited: the provider evidence counts `data[]`
         *  and the provider consolidate lifts `credits_charged`. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "postings",
            consumes: { credit: "default", amount: 1 },
            description: "one credit per posting returned; postings already " +
                "paid for this calendar month are free",
        },
        /** The caller-stated limit IS the posting promise (typed read of
         *  the pre-toRequest validated input — design D25). The plan cap
         *  may clamp it lower; the vendor claim settles the truth. */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.limit },
        }),
    },
});
