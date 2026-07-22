# Token estimation third-party notices

These assets and libraries are loaded only after the user enables Token estimation. Token estimation runs locally in a Web Worker; editor text is not sent to a remote tokenizer service.

## Tokenizer assets

### DeepSeek V4

- File: `deepseek-v4.json`
- Upstream: `deepseek-ai/DeepSeek-V4-Pro/tokenizer.json`
- Revision: `0e1a0e5e52aea73055f50fef6f2423db370265b6`
- Source: <https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/0e1a0e5e52aea73055f50fef6f2423db370265b6/tokenizer.json>
- Size: 6,367,146 bytes
- SHA-256: `8F9F37CA37FDC4F5FD36D5CF4D3B0E8392EDB4E894FD10CC0D70B4957C8633CF`
- License: MIT; see `licenses/deepseek-MIT.txt`

### Claude legacy tokenizer

- File: `claude.json`
- Upstream: `anthropics/anthropic-tokenizer-typescript/claude.json`
- Revision: `97b8ffad623d56098ece249301d2e28398a700f4`
- Source: <https://github.com/anthropics/anthropic-tokenizer-typescript/blob/97b8ffad623d56098ece249301d2e28398a700f4/claude.json>
- Size: 696,615 bytes
- SHA-256: `58DAD83D85E9CD57BE209172449EBFBC395DF2B455C11FE8B7E5B661E6F462AD`
- License: MIT; see `licenses/anthropic-MIT.txt`
- Accuracy note: Anthropic published this tokenizer for older Claude models. Counts for Claude 3 and later are intentionally presented as rough estimates only.

### Gemma tokenizer used for Gemini approximation

- File: `gemma.model`
- Upstream: `SillyTavern/SillyTavern/src/tokenizers/gemma.model`
- Revision: `51ad27fb86d39a3daca3adaa970375c9670c12df` (SillyTavern 1.18.0)
- Source: <https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/src/tokenizers/gemma.model>
- Size: 4,241,003 bytes
- SHA-256: `61A7B147390C64585D6C3543DD6FC636906C9AF3865A5548F27F31AEE1D4C8E2`
- Repository license: GNU AGPL-3.0; see `licenses/SillyTavern-AGPL-3.0.txt`. This notice records the distribution source and does not replace any upstream model terms that may also apply.
- Accuracy note: this resource is used only as a Gemma-based approximation for Gemini, not as an official Gemini tokenizer.

## Runtime libraries

### @mlc-ai/web-tokenizers 0.1.6

- Package: <https://www.npmjs.com/package/@mlc-ai/web-tokenizers/v/0.1.6>
- Source: <https://github.com/mlc-ai/tokenizers-cpp/tree/main/web>
- License: Apache-2.0; see `licenses/mlc-tokenizers-Apache-2.0.txt`
- Use: local Hugging Face JSON and SentencePiece tokenization for DeepSeek V4 and Gemma.

### js-tiktoken 1.0.21

- Package: <https://www.npmjs.com/package/js-tiktoken/v/1.0.21>
- Source revision: `4c8b748e07992c00386f3180af5c574b27b65139`
- Source: <https://github.com/dqbd/tiktoken/tree/4c8b748e07992c00386f3180af5c574b27b65139>
- License: MIT; see `licenses/js-tiktoken-MIT.txt`
- Use: parsing Anthropic's legacy tiktoken-format Claude vocabulary.

### base64-js 1.5.1

- Package: <https://www.npmjs.com/package/base64-js/v/1.5.1>
- License: MIT; see `licenses/base64-js-MIT.txt`
- Use: transitive dependency of `js-tiktoken`.
