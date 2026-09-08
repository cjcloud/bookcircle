import type { Tone } from './types.ts';

// Curated fixture wording: each tone keeps the same discussion topic.
export const toneWording: Record<string, Record<Tone, string>> = {
  "bc-c1": {
    "Conversational": "Did Beth's grief over Bobby make her secrecy with Frank and her affair with Gabriel more understandable, or not?",
    "Direct": "How far does Beth's grief over Bobby lessen her responsibility for deceiving Frank and beginning the affair?",
    "Thoughtful": "To what extent does Beth's grief over Bobby justify her secrecy with Frank and her affair with Gabriel?"
  },
  "bc-c2": {
    "Conversational": "Did Beth return because she loved Gabriel as he was in 1968, or because being with him revived the future they had imagined at seventeen?",
    "Direct": "Was Beth choosing Gabriel in 1968, or trying to recover the future they had planned at seventeen?",
    "Thoughtful": "Did Beth return because she loved the man Gabriel had become, or because being with him revived the future they had imagined before he left?"
  },
  "bc-c3": {
    "Conversational": "Did Beth, Gabriel and Frank behave in ways their histories made believable, or did Hall make them behave implausibly to keep the love triangle going?",
    "Direct": "Did the characters behave believably, or did Hall force their decisions to prolong the love triangle?",
    "Thoughtful": "Do the characters' histories adequately explain their decisions, or does Hall make them act against those histories to sustain the love triangle?"
  },
  "bc-c4": {
    "Conversational": "Did Hall's descriptions make Beth's grief and longing more vivid, or repeat and explain those feelings until the scenes became less moving?",
    "Direct": "Did Hall's descriptions make Beth's grief and longing more vivid, or explain those feelings so often that the scenes became less moving?",
    "Thoughtful": "Did Hall make Beth's grief and longing more vivid through precise details, or weaken those feelings by repeatedly explaining them?"
  },
  "bc-c5": {
    "Conversational": "Did the novel show convincingly how grief over Bobby affected Beth, Frank and Jimmy, or were some of their later actions insufficiently explained?",
    "Direct": "Did grief over Bobby convincingly contribute to Beth's renewed attachment to Gabriel, Frank's self-blame and Jimmy's anger, or were those connections insufficiently developed?",
    "Thoughtful": "Does the novel show convincingly how grief over Bobby contributes to Beth's renewed attachment to Gabriel, Frank's self-blame and Jimmy's violent anger, or are some of those connections insufficiently developed?"
  },
  "bc-c6": {
    "Conversational": "Did moving between 1955, 1968 and the trial make each revelation more effective, or did withholding Bobby's paternity and the shooting details feel manipulative?",
    "Direct": "Did withholding Bobby's paternity and the shooting details create justified suspense?",
    "Thoughtful": "Did the three timelines allow the revelations about Bobby and the shooting to gain meaning, or simply delay information needed to understand the plot?"
  },
  "broken-country-extra-1": {
    "Conversational": "Did Frank accept responsibility for the shooting mainly to protect Leo, or because guilt over Bobby's death made him willing to sacrifice his own future?",
    "Direct": "Was Frank protecting Leo or punishing himself for Bobby's death?",
    "Thoughtful": "Did Frank accept responsibility for the shooting chiefly to save Leo, or because guilt over Bobby made him willing to sacrifice his own future?"
  },
  "broken-country-extra-2": {
    "Conversational": "Were the emotional scenes convincing because they showed the consequences for Beth, Frank and Leo, or did repeated descriptions of their pain make those scenes less moving?",
    "Direct": "Did the consequences for Beth, Frank and Leo make the emotional scenes convincing, or did the narration explain their pain too often?",
    "Thoughtful": "Did the emotional scenes draw their power from what Beth, Frank and Leo lost and did, or did repeated explanations of their pain weaken those scenes?"
  },
  "broken-country-extra-3": {
    "Conversational": "Did Gabriel's return, Leo's bond with Beth and the events leading to the shooting follow convincingly, or depend too heavily on coincidence?",
    "Direct": "Did the events leading from Gabriel's return to the shooting depend too much on coincidence?",
    "Thoughtful": "Did the causal links between Gabriel's return, Leo's attachment to Beth and the shooting make the plot convincing, or did chance do too much of the work?"
  },
  "broken-country-extra-4": {
    "Conversational": "Did the novel give Beth's obligations to Frank, the farm and their family as much weight as her renewed love for Gabriel?",
    "Direct": "Did Beth's romance with Gabriel overshadow her obligations to Frank and the farm?",
    "Thoughtful": "Does the novel treat Beth's marriage, family and work as seriously as her desire for Gabriel, or allow romantic longing to dominate their consequences?"
  },
  "ku-c1": {
    "Conversational": "Did Kundera's ideas add to the story, or did you want him to get on with it?",
    "Direct": "Did the reflections help or interrupt the story?",
    "Thoughtful": "When did Kundera's reflections add something, and when did you want more of the story?"
  },
  "ku-c2": {
    "Conversational": "Was Tomas protecting his freedom, or avoiding responsibility?",
    "Direct": "Was Tomas free or avoiding commitment?",
    "Thoughtful": "Where did Tomas's wish for freedom become a way to avoid responsibility?"
  },
  "ku-c3": {
    "Conversational": "Did the narrator help you understand, or explain too much?",
    "Direct": "Did the narrator explain too much?",
    "Thoughtful": "When did the narrator help you think, and when did he leave too little for you to decide?"
  },
  "ku-c4": {
    "Conversational": "Did Tereza and Sabina feel like people in their own right, or mainly part of the men's stories?",
    "Direct": "Did Tereza and Sabina have enough of their own story?",
    "Thoughtful": "How well did you come to know Tereza and Sabina beyond their relationships with men?"
  },
  "ku-c5": {
    "Conversational": "Did you believe in the relationships, or did they feel like examples of the book's ideas?",
    "Direct": "Did the relationships feel real or serve the ideas?",
    "Thoughtful": "When did the characters feel like real people, and when did they seem to stand for an idea?"
  },
  "ku-c6": {
    "Conversational": "Did the politics make the personal choices matter more, or feel like a separate story?",
    "Direct": "Did the politics strengthen the personal story?",
    "Thoughtful": "How did the political events change the way you understood the relationships?"
  },
  "kundera-extra-1": {
    "Conversational": "Did responsibilities give their lives meaning, or hold them back?",
    "Direct": "Did responsibility give meaning or limit freedom?",
    "Thoughtful": "Which responsibilities made life richer, and which closed off choices?"
  },
  "kundera-extra-2": {
    "Conversational": "Did being close help them feel free, or make them feel owned?",
    "Direct": "Did intimacy support freedom or restrict it?",
    "Thoughtful": "When did closeness give the characters freedom, and when did it take freedom away?"
  },
  "kundera-extra-3": {
    "Conversational": "Did going back over events show you something new, or feel repetitive?",
    "Direct": "Did the repeated events add anything new?",
    "Thoughtful": "What changed for you when the story returned to an earlier event?"
  },
  "kundera-extra-4": {
    "Conversational": "Did the writing's distance help you see more, or make it harder to care?",
    "Direct": "Did the detached writing help or weaken the emotion?",
    "Thoughtful": "How did the distance in the writing affect how much you cared about the characters?"
  },
  "fu-c1": {
    "Conversational": "Did Henry's childhood help explain his behaviour, or was there more to it?",
    "Direct": "How much did Henry's childhood explain his behaviour?",
    "Thoughtful": "Where did Henry's childhood help you understand him, and where did that explanation fall short?"
  },
  "fu-c2": {
    "Conversational": "Could you believe David gained control so slowly, or should someone have stepped in?",
    "Direct": "Was David's gradual takeover believable?",
    "Thoughtful": "What made David's growing control believable, and when did you expect someone to stop him?"
  },
  "fu-c3": {
    "Conversational": "Did the different viewpoints keep you interested, or leave you confused?",
    "Direct": "Did the viewpoints create interest or confusion?",
    "Thoughtful": "When did changing viewpoints help, and when was it hard to track who knew what?"
  },
  "fu-c4": {
    "Conversational": "Did you enjoy the speed, or want more time with the characters?",
    "Direct": "Was the pace right, or too fast?",
    "Thoughtful": "Where would slowing down have helped you understand a character better?"
  },
  "fu-c5": {
    "Conversational": "Did the ending fit together well, or feel too neatly arranged?",
    "Direct": "Did the plot come together convincingly?",
    "Thoughtful": "Which parts of the ending felt convincing, and which felt arranged to make the plot work?"
  },
  "fu-c6": {
    "Conversational": "Did you keep reading for the people, or mainly to solve the mystery?",
    "Direct": "Did you care more about the people or the puzzle?",
    "Thoughtful": "As the answers emerged, what kept you interested in the characters themselves?"
  },
  "family-upstairs-extra-1": {
    "Conversational": "Did family ties offer belonging, or mostly bring obligations?",
    "Direct": "Did family ties offer comfort or burden?",
    "Thoughtful": "When did family connections give support, and when did they become a burden?"
  },
  "family-upstairs-extra-2": {
    "Conversational": "Could they move on, or did the house still shape their choices?",
    "Direct": "How free were they from their past?",
    "Thoughtful": "Which later choices suggested they could move on, and which showed the house still affected them?"
  },
  "family-upstairs-extra-3": {
    "Conversational": "Did you have a fair chance to guess, or were key clues held back?",
    "Direct": "Were the clues fair to the reader?",
    "Thoughtful": "Which clues helped you work things out, and what seemed hidden just to preserve the surprise?"
  },
  "family-upstairs-extra-4": {
    "Conversational": "Did you leave thinking about the people, or mostly the twists?",
    "Direct": "What stayed with you: the people or the twists?",
    "Thoughtful": "Once you knew the answers, what about the characters stayed with you?"
  },
  "bc-gd": {
    "Conversational": "Can you understand someone's choices and still blame them?",
    "Direct": "Does understanding remove responsibility?",
    "Thoughtful": "When does understanding a person's reasons change how much you blame them?"
  },
  "ku-gd": {
    "Conversational": "Would having no ties make life better, or leave something missing?",
    "Direct": "Would complete freedom make life more meaningful?",
    "Thoughtful": "Which ties limit our freedom but also make life matter to us?"
  },
  "fu-gd": {
    "Conversational": "Why might people with similar childhoods make very different choices?",
    "Direct": "How much do childhood and later choices each shape a person?",
    "Thoughtful": "How would you weigh what happened to someone against the choices they later made?"
  }
};
