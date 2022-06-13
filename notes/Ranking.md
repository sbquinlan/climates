I want to collect my thoughts on the Halo ranking system. I believe that the ranking system and the use of ranking in matchmaking is seriously flawed to the point of making the game unenjoyable.

## Assumptions

A point of clarity. There are two "ranks" used in Halo. One, an account-wide rank, based on Trueskill that is primarily used for matchmaking. Two, a playlist specific rank, which awards points similarly to the aforementioned Trueskill system but potentially based on win/loss.

I believe these assumptions are true from the research paper on Trueskill published by Microsoft Research which documents the Trueskill (v1 and v2) ranking system and the investigations into Halo Infinite's ranking system done by the community. 

From these assumptions, I believe there are two flaws in the design. The primary flaw is simply the use of Trueskill; and the other, the use of two ranking systems.

## Trueskill

Trueskill is an estimation algorithm. The algorithm is trying to estimate the skill of a player in a team game. This is done by using individual performance metrics like kills, assists, and deaths to indicate the quality of a contribution to a win or a loss. Intuitively, players with higher performance metrics deserve more credit for a team's win and less credit for a team's loss. This is in contrast to rank estimation algorithms that are purely based on win / loss performance, which have classically been employed in team-less games.

The basis of the system is intuitive at first glance. Good players shouldn't be punished for playing with bad players. Great players should rise above good players. What's more is that the paper shows this system more accurately predicts the outcome of matches, showing that this intuitive has some truth to it. There are some less intuitive outcomes of this system though, particularly when you assume that players want to maximize their own rank.

### Kills are king

One major criticism is the use of only kills as an indication of skill. When the gametype is kill based as in Slayer, the use of kills as a metric is obvious. When the gametype is not Slayer, this becomes dubious. This is especially true in gametypes where an objective that precludes kills, or at least significantly hampers kills (Oddball or CTF). In these game types, it would seem that making game winning contributions like holding the ball and carrying the flag are not rewarded.

The more precision and damaging criticism of making kills the paramount metric in the game is that makes gameplay one dimensional by discouraging creativity and alternative strategy. In other words, any strategy or style of play that doesn't maximize kills is suboptimal to the player that seeks to maximize their rank.

There are two important responses to this. One, the strategy of having the least skilled player carry the objective is best, as it allows the team the best chance of controlling the objective (not being killed). Two, killing is still critically important to all gametypes; therefore, "good enough" as an indicator of individual performance.

#### Optimal Strategy

I don't intend to discuss optimal strategy here, just the implications of the ranking system scoring different strategies. By doing so, we can avoid the controversy of the least skilled player to control the objective, and instead, concentrate on two less controversial points.

First, there is a gradient to skill in controlling the objectives. This is more obvious with flag objectives then it is with ball objectives. Running the flag is a critical play of CTF games. More experienced players know better routes, are able to "juggle" / "dribble" the flag. Experienced players may employ strategies of "baiting" a flag or "tossing" the flag to other players. By ignoring these plays as "unskillful", Trueskill is introducing error into it's estimation.

Second, by treating plays with the objective as unskillful, the ranking system is discouraging alternative strategies. Strategies that rely on misdirection, evasion, and stealth could be skillful, could be a significant contribution towards victory, but are not rewarded.

Even if we concentrate on the slayer gametype, there's bound to be Trueskill, as implemented, is reductive to strategy.

#### Good Enough

The Trueskill paper says that kills . It is an important point to make in the paper. In other words, just using kills is "good enough" to outperform other estimators, but for practical application, using kills is not "good enough."

"Good enough" is has a different meaning the players of the game than it does to academia trying to improve predictive models. The former being a much higher bar than the latter. Here is a key take away. There is a MAJOR difference between these two tasks:
1. estimating players skill
2. rewarding players for good play

There are similarities to be sure, but very significant differences such that what is good enough for one shouldn't be assumed to be good enough for the other.

[i want to make a point here about how even in slayer games not all kills are equal]
[i want to make a point here where it's nearly impossible for any ranking system to not be reductive to strategy, so the take away should be to be as complete as possible 
[theres another point that like the combination of hiding the rank is a way to not be reductive on strat, but there are even more downsides to hiding the rank]

### Keep your friends close and your teammates closer

It's the conclusion of these two points that reaches an obvious fallacy. In a game where all players are trying to
