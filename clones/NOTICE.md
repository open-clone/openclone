# clones/ 라이센스 및 출처 표기 안내

이 문서는 `clones/` 디렉토리 콘텐츠의 라이센스, 표기 의무, 원저작자 권리 처리 정책을 정리합니다. 저장소 코드(소스 전반)는 별도로 MIT License를 따르며, 그 내용은 저장소 루트 `LICENSE` 파일에 있습니다.

## 라이센스

- **종류**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
- **전문**: [`clones/LICENSE`](LICENSE)
- **요약**: 저작자 표기(BY) + 비상업적 용도(NC) + 동일 라이센스 공유(SA)

이 라이센스는 `clones/` 아래의 모든 파일에 적용됩니다.

## 저작권자

`clones/` 콘텐츠의 저작권자는 **openclone contributors** (본 저장소의 git history에 기록된 모든 기여자)입니다. 저장소 URL: <https://github.com/open-clone/openclone>

## 콘텐츠 분류

### `clones/<slug>/persona.md`

openclone 프로젝트가 직접 작성한 캐릭터 묘사입니다. 공개된 인터뷰·발언·글을 바탕으로 구성된 **2차 저작물(요약·재구성)**이며, 인물 본인의 "아바타"가 아니라 공개된 관점을 재현하는 도구입니다.

- **라이센스**: CC BY-NC-SA 4.0
- **저작권자**: openclone contributors

### `clones/<slug>/knowledge/*.md`

외부 출처(공개 인터뷰, 블로그, LinkedIn, 영상 자막 등)에서 수집·요약·인용한 자료입니다.

- **수집된 모음(compilation) 자체의 라이센스**: CC BY-NC-SA 4.0 (openclone contributors)
- **개별 파일에 인용된 원자료의 권리**: 각 파일 frontmatter의 `source_url`이 가리키는 원출처를 따릅니다. 원저작자는 자신의 자료에 대한 모든 권리를 그대로 보유합니다.

각 knowledge 파일의 frontmatter 예시:

```yaml
---
topic: ...
source_type: interview | blog | linkedin | youtube | ...
source_url: https://...           # 원출처 URL (재배포·인용 시 반드시 함께 표기)
authorship: 원저작자 이름 또는 핸들
published_at: YYYY-MM-DD
---
```

`source_url`이 없는 파일은 (a) openclone contributors가 직접 작성한 노트이거나 (b) 원출처 추적이 누락된 경우입니다. 후자는 [이슈](https://github.com/open-clone/openclone/issues)로 알려주시면 보완하겠습니다.

## 표기 방법

`clones/` 콘텐츠를 비상업적 용도로 재사용할 때는 다음을 모두 표기해 주세요.

1. **저작권자**: "openclone contributors"
2. **저장소 링크**: <https://github.com/open-clone/openclone>
3. **라이센스**: "CC BY-NC-SA 4.0" (가능하면 <https://creativecommons.org/licenses/by-nc-sa/4.0/> 링크)
4. **수정 여부**: 원본을 수정·각색했다면 그 사실을 명시
5. **개별 출처(knowledge 파일을 인용하는 경우)**: 해당 파일 frontmatter의 `source_url`을 함께 표기. 원저작자가 명시되어 있다면 원저작자도 함께 표기

표기 예:

> "openclone contributors, 'Douglas (권도균) persona', CC BY-NC-SA 4.0, <https://github.com/open-clone/openclone>. 인용된 발언 출처: <원 source_url>"

## 비상업적(NonCommercial) 사용

CC BY-NC-SA 4.0의 NC 조항에 따라, `clones/` 콘텐츠를 **상업적 이익을 주된 목적으로** 사용하는 것은 금지됩니다. 여기에는 다음이 포함됩니다.

- 유료 SaaS·앱·서비스의 일부로 콘텐츠를 통합·배포
- 콘텐츠를 학습 데이터로 사용한 **상업용 AI 모델**의 학습·파인튜닝
- 광고·구독·결제가 결합된 콘텐츠 재배포

비상업적 연구·교육·개인 용도, 비영리 단체의 활동, 학술 연구·논문 인용은 허용됩니다. 상업적 사용에 대해서는 별도 라이센스를 협의해야 하며 `hayun@rapidstudio.dev`로 문의해 주세요.

## 동일 라이센스 공유(ShareAlike)

`clones/` 콘텐츠를 수정하거나 2차 저작물(번역, 발췌, 재구성 등)을 만들어 공개·배포한다면, 결과물도 **CC BY-NC-SA 4.0** 또는 호환 라이센스로 공개해야 합니다.

## 본인의 수정·삭제 요청 (옵트아웃)

자신이 묘사된 클론(persona.md, knowledge/*.md)에 대해 다음을 요청할 수 있습니다.

- 현재 포함된 자료 확인
- 특정 인용·문장·지식 파일의 수정·삭제
- 표기 정정 (`display_name`, `tagline`, 소속 등)
- 페르소나 전체 제거

**문의 경로**: 공개 요청은 [옵트인 이슈 템플릿](https://github.com/open-clone/openclone/issues/new?template=opt_in_request.md), 사적 증빙이 필요한 경우는 `hayun@rapidstudio.dev`. 자세한 내용은 README의 ["옵트인 (실존 인물 클론)"](../README.md#옵트인-실존-인물-클론) 섹션 참고.

## 새 콘텐츠 추가 시

`clones/`에 새 클론·지식 파일을 추가하는 기여자는 다음에 동의함을 의미합니다.

1. 자신의 기여를 **CC BY-NC-SA 4.0**으로 공개
2. 외부 자료를 인용하는 경우 frontmatter의 `source_url`을 반드시 채움
3. 비상업·동일 라이센스 조건과 충돌하는 출처(예: NoDerivs 라이센스, 사적 비공개 자료)는 포함하지 않음

기여 절차는 [CONTRIBUTING.md](../CONTRIBUTING.md)를 참고하세요.
