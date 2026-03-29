## Q1 What Needed To Improve?

- What was the most important gap(s) or limitation after D2?
  
  The core philosphy behind our project is making University of Toronto students more financially responsible and
  also effectively able to understand and allocate their finances, especially given the recent OSAP cuts.
  Therefore, n D2, we tried to direct students towards understanding how to take advantage of opportunities that are available
  to them as UofT studnets like scholarships/bursaries available to them or student discount codes available on various expenses.
  That is some level of financial understanding, but now we really want to help them manage their current finances. For instance,
  what current expenses can they possibly cut down or make savings from or how they can they invest these savings effectively in
  like stocks/ETFs. So we are trying to help them analyze and grow their savings and also build financial goals that they can
  actually work towards. This will make our project more holistic.

- How did you identify it (user feedback, partner input, team reflection, testing)? (<1 paragraph)

    We had several team meetings in which we discussed what problems we have encountered in terms of our own
    fiancial journey throughout our undergraduate years. This included a mix of not knowing all the oppotunities available to us,
    but also not being fully optimal in terms our financial expenditures and potential revenue generation. Furthermore, we also
    reached out to fellow students and made them users and took their feedback.

## Q2 What You Did?

- High-level description of what was implemented

  We implemented a new feature through which users can connect their bank accounts to our application. Then they are directed towards
  reccuring expenses in their account statements and potential savings are generated. There is a separate investment feature which enables them to set targeted goals with deadlines like saving money to purchase a new laptop.
  Accordingly, they are also directed to potential stocks/ETFs they can invest in depending on their risk and time preferences.
  We also finalized and completed all frontend elements and also added certain onboarding questions that enable better
  help like whether they are an international or domestic student etc.

- Key architectural or design changes (if any)

  We simply worked to refine our UI designs, add in all the necessary frontend elements, and also deploy our product with
  user feedback.

- Integration challenges encountered

  Initially, we did encounter some challenges in terms of the deployment phase and the backend and frontend was not being
  tied together effectively like when a user had been created sometimes authentication was not fully working. But we
  were able to debug and resolve the issue after a few team meetings.

## Q3 Before vs. After

- How did you improve the system?

  Previously, our system mainly helped students discover financial opportunities such as scholarships, bursaries, and student discount codes. While useful, it did not directly help users manage their own spending or plan their finances.
  After the improvements, the platform now allows users to connect their bank accounts and analyze their transactions to identify recurring expenses and potential savings. These estimated savings are then used in a new investment guidance feature where users can set financial goals and explore practice portfolios based on their risk preferences and timelines.
  Overall, the system evolved from a financial opportunity discovery tool into a more holistic financial guidance platform that helps students both reduce unnecessary spending and plan how to grow their savings.

- Concrete improvements (workflow clarity, speed, error reduction, reliability, etc.)

  The improvements made the system significantly more practical and reliable for users. By integrating bank account
  data and automating transaction analysis, the platform now reduces manual effort and provides clearer insights into
  recurring expenses and potential savings. The addition of goal setting and investment guidance also improves workflow
  clarity by guiding users from identifying savings to planning how to allocate them toward financial goals.

## Q4 Reflection

- What worked well?

Team collaboration and regular meetings helped us quickly identify problems and iterate on solutions.
Integrating the spending analysis with the investment guidance feature worked well and created a more cohesive user experience.
User feedback from fellow students helped us refine the interface and workflow.

- What was harder than expected?

  Integrating the frontend and backend required careful coordination, particularly ensuring authentication worked
  consistently across features. We also encountered some challenges during deployment and while connecting
  transaction data to the spending analysis logic. However, through regular team discussions and debugging sessions,
  we were able to quickly identify and resolve these issues. This process ultimately helped us build a more stable and reliable system.

 - How does this improvement affect your path to D4?

   These improvements give us a strong foundation for D4 by establishing the core features for
   spending analysis, savings estimation, and investment guidance. With the main system now integrated and functional,
   we can focus on refining the user experience and expanding the intelligence of the platform.
   In particular, we hope to incorporate a simple machine learning component
   that can better analyze spending patterns and generate more personalized financial recommendations for users.
