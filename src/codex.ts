import axios from "axios";
import fs from "fs";
import { performance } from "perf_hooks";
import { ICompletionModel } from "./completionModel";
import { trimCompletion } from "./syntax";

const defaultPostOptions = {
  max_tokens: 100, // maximum number of tokens to return
  temperature: 0, // sampling temperature; higher values increase diversity
  n: 5, // number of completions to return
  top_p: 1, // no need to change this
};
export type PostOptions = Partial<typeof defaultPostOptions>;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Please set the ${name} environment variable.`);
    process.exit(1);
  }
  return value;
}

export class Codex implements ICompletionModel {
  private readonly apiEndpoint: string;
  private readonly authHeaders: string;

  constructor(
    private readonly isStarCoder: boolean,
    private readonly instanceOptions: PostOptions = {}
  ) {

    this.apiEndpoint = "https://api.openai.com/v1/chat/completions";
    this.authHeaders = '{"Authorization": "Bearer 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","OpenAI-Organization": "org-LUunHCckTG5Xcx8LzbbUsQ6D"}';

  }

  /**
   * Query Codex for completions with a given prompt.
   *
   * @param prompt The prompt to use for the completion.
   * @param requestPostOptions The options to use for the request.
   * @returns A promise that resolves to a set of completions.
   */
  public async query(
    prompt: string,
    requestPostOptions: PostOptions = {}
  ): Promise<Set<string>> {
    const headers = {
      "Content-Type": "application/json",
      ...JSON.parse(this.authHeaders),
    };
    const options = {
      ...defaultPostOptions,
      // options provided to constructor override default options
      ...this.instanceOptions,
      // options provided to this function override default and instance options
      ...requestPostOptions,
    };

    performance.mark("codex-query-start");

    let postOptions = this.isStarCoder
      ? {
        inputs: prompt,
        parameters: {
          max_new_tokens: options.max_tokens,
          temperature: options.temperature || 0.01, // StarCoder doesn't allow 0
          n: options.n,
        },
      }
      : {
        prompt,
        ...options,
      };


    // console.log("===========> ", postOptions);

    let postOptions2 = {
      "model": "gpt-3.5-turbo",
      "messages": [
        {
          "role": "user",
          "content": "Write unit tests for the following function: function add(a, b) { return a + b; }"
        }
      ]
    }

    const res = await axios.post(this.apiEndpoint, postOptions2, { headers });

    // console.log("====> ", res);

    res.data = {
      "id": "cmpl_abc123",
      "model": "code-cushman-001",
      "created": "2024-03-29T12:00:00Z",
      "prompt": "def add(a, b):",
      "completions": [
        {
          "generated_text": "    return a + b",
          "score": 0.95
        },
        {
          "generated_text": "    result = a + b",
          "score": 0.90
        },
        {
          "generated_text": "    sum = a + b",
          "score": 0.85
        }
      ]
    }


    // const res = {
    //   status: 200,
    //   error: false,
    //   data: {
    //     "id": "cmpl_abc123",
    //     "model": "code-cushman-001",
    //     "created": "2024-03-29T12:00:00Z",
    //     "prompt": "def add(a, b):",
    //     "completions": [
    //       {
    //         "text": "    return a + b",
    //         "score": 0.95
    //       },
    //       {
    //         "text": "    result = a + b",
    //         "score": 0.90
    //       },
    //       {
    //         "text": "    sum = a + b",
    //         "score": 0.85
    //       }
    //     ]
    //   }
    // }


    performance.measure(
      `codex-query:${JSON.stringify({
        ...options,
        promptLength: prompt.length,
      })}`,
      "codex-query-start"
    );
    if (res.status !== 200) {
      throw new Error(
        `Request failed with status ${res.status} and message ${res.statusText}`
      );
    }
    if (!res.data) {
      throw new Error("Response data is empty");
    }
    const json = res.data;
    // if (json.error) {
    //   throw new Error(json.error);
    // }
    let numContentFiltered = 0;
    const completions = new Set<string>();

    for(let data of json.completions){
      console.log("===>",data?.generated_text);
      
      completions.add(data?.generated_text);
    }
    // if (false) {
    //   completions.add(json?.completions);
    // } else {
    //   for (const choice of json.choices || [{ text: "" }]) {
    //     if (choice.finish_reason === "content_filter") {
    //       numContentFiltered++;
    //     }
    //     completions.add(choice.text);
    //   }
    // }
    if (numContentFiltered > 0) {
      console.warn(
        `${numContentFiltered} completions were truncated due to content filtering.`
      );
    }

    console.log("======>",completions);
    
    return completions;
  }

  /**
   * Get completions from Codex and postprocess them as needed; print a warning if it did not produce any
   *
   * @param prompt the prompt to use
   */
  public async completions(
    prompt: string,
    temperature: number
  ): Promise<Set<string>> {
    try {
      let result = new Set<string>();
      for (const completion of await this.query(prompt, { temperature })) {
        result.add(trimCompletion(completion));
      }
      return result;
    } catch (err: any) {
      console.warn(`Failed to get completions: ${err.message}`);
      return new Set<string>();
    }
  }
}

if (require.main === module) {
  (async () => {
    const codex = new Codex(false);
    const prompt = fs.readFileSync(0, "utf8");
    const responses = await codex.query(prompt, { n: 1 });
    console.log([...responses][0]);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
