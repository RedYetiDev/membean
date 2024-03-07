# Membean.JS
> [!CAUTION]
> This is a pre-release version of Membean.JS. The API is subject to change, and the documentation is not yet complete. Please use with caution.

Documentation is coming soon.

## Todo List
- [x] Core *(Priority: **High**)*
  - [ ] API Typings
  - [x] Answer Questions Correctly / Incorrectly
  - [x] Learn new words
    - [x] 'I Know This'
    - [x] Spelltest
  - [x] Restudy
- [ ] Documentation *(Priority: **High**)*
- [ ] Test Module *(Priority: **Low**)*
- [ ] Customization *(Priority: **Low**)*
- [ ] Extensions *(Priority: **Low**)*

## Status Updates
> [!NOTE]
> *Latest Update: 3/6/2024*
> 
> Hi! The good ol' project wheels are a-turning and this project is starting up. While it is not even close to done, the bare bones are in.
> Over the next few weeks I will implementing different parts (Probably one or two new features a week or two). During this process, the API will be unstable, but usable.
> The next steps to this API are:
> - [ ] JSDoc Typings *(Once these are done, the documentation can be automatically generated)*
> - [ ] Removal of debug loggings *(This'll only take a second)**
> - [ ] new class `MembeanSession(id: number)` *(Hoping to get out this week)*
>    - [ ] Start Session
>    - [x] Stop Session
>
> By the way, to use this, you need two things:
> - Your Membean session ID (`https://membean.com/training_sessions/<this number>/user_state`)
> - Your Membean auth token (Stored in the `auth_token` cookie, but you can get it by pasting this into the URL bar: `javascript:alert(document.cookie.match(/auth_token=([a-zA-Z0-9_-]+);?/)[1])`)

Do you have a suggestion? [Create an issue](https://github.com/redyetidev/membean/issues/new)

While this code differs greatly from [Jurassic001's AutoBean](https://github.com/jurassic001/AutoBean), it was inspired by it.

---

# License
> [![Creative Commons License](https://licensebuttons.net/l/by/4.0/80x15.png)](http://creativecommons.org/licenses/by/4.0/)
> **Membean.JS** by [RedYetiDev](https://redyetidev.github.io) is licensed under [Attribution 4.0 International](http://creativecommons.org/licenses/by/4.0/).
