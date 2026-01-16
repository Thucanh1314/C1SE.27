#!/usr/bin/env node

/**
 * Seed Responses for "Tun Sale" Survey
 * Creates 40 realistic survey responses for analytics testing
 * Run: node scripts/seed-tunsale-responses.js
 */

require('dotenv').config();

const {
    sequelize,
    Survey,
    Question,
    QuestionType,
    SurveyResponse,
    Answer,
    User,
    SurveyCollector
} = require('../src/models');

const logger = console;

// Categorized responses for smarter seeding
const RESPONSES_BY_CATEGORY = {
    // Category: Challenges / Obstacles
    challenges: [
        "The legal review process is taking way too long, I lost two deals just waiting for redlines.",
        "Honestly, our pricing is becoming a major issue against competitors who are undercutting us by 20%.",
        "I don't have enough qualified leads in my pipeline to hit the aggressive targets this quarter.",
        "The product demo environment keeps crashing during presentations, it's embarrassing.",
        "We are spending too much time on internal administrative tasks instead of selling.",
        "My territory is completely saturated, I'm just fighting for scraps at this point.",
        "The new competitor feature set is miles ahead of ours, customers are noticing.",
        "Marketing isn't providing the right collateral for the enterprise segment.",
        "I'm actually hitting my numbers fine, the biggest obstacle is just managing the volume.",
        "Cross-team collaboration with the solution engineers is non-existent, they are always booked.",
        "Customers are freezing budgets due to the economic uncertainty, it's not a product issue.",
        "We need more flexibility to offer discounts without needing VP approval every single time.",
        "The onboarding process for new clients is so complex it scares prospects away.",
        "I feel like we are constantly shifting strategy and it confuses the customers.",
        "The sales targets are realistic, I just need to focus more on closing.",
        "We lack a clear value proposition for the healthcare vertical specifically.",
        "I'm spending 40% of my week updating Salesforce instead of calling prospects.",
        "The legal team is actually pretty fast, my issue is just finding the right decision maker.",
        "Competitors are spreading FUD about our security compliance and we don't have a good rebuttal.",
        "Our follow-up automation is broken, I have to manually track every single touchpoint."
    ],
    // Category: CRM / Tools
    crm: [
        "It's extremely slow and clunky, updating a single Opportunity takes ten clicks.",
        "The mobile app is fantastic, allows me to update records on the road easily.",
        "I honestly hate it, I've gone back to using my spreadsheet for tracking.",
        "The reporting features are great for visibility but the data entry is a nightmare.",
        "It's definitely an improvement over the old system, much more intuitive.",
        "I can't find anything, the search functionality is completely broken.",
        "Integration with my email is seamless, saves me about an hour a day.",
        "It's too complex, we have too many required fields that don't add value.",
        "The automated reminders are actually helpful for keeping on top of follow-ups.",
        "It crashes constantly when I try to export data for my QBR.",
        "I feel like Big Brother is watching, it's more for management control than helping me sell.",
        "The dashboard gives me a clear view of my pipeline, I rely on it daily.",
        "It's just another tool I have to log into, doesn't really help me close deals.",
        "The training we got was insufficient, I'm still figuring out basic functions.",
        "Data quality is poor because nobody wants to fill out the fifty required fields.",
        "I love the AI-driven insights on lead scoring, it actually highlights good prospects.",
        "It's faster than the old one but lacks the customization we used to have.",
        "Support takes days to respond when I get locked out or encounter a bug.",
        "It's fine, just a standard CRM, neither good nor bad.",
        "Synchronization with the marketing automation platform is broken, leads are missing."
    ],
    // Category: Training / Enablement
    training: [
        "We need way less theory and way more practical role-playing scenarios.",
        "Stop making us watch 3-hour videos, short interactive modules would be better.",
        "The product training is outdated, we're selling features that don't even exist yet.",
        "I'd like to see more mentorship from the senior AEs who are actually crushing it.",
        "The negotiation workshop was excellent, we need more deep dives like that.",
        "Training should be continuous, not just a one-week firehose during onboarding.",
        "We need specific training on how to sell against our new low-cost competitors.",
        "Bring in external sales experts, the internal trainers are too disconnected from reality.",
        "The onboarding was great, I felt fully prepared to start calling in week two.",
        "More focus on soft skills and emotional intelligence would be beneficial.",
        "It's a waste of time, I learn more by just doing the job.",
        "Please update the objection handling scripts, customers see right through them.",
        "We need training on the technical aspects of the product, I feel like I'm bluffing.",
        "The gamification aspect is childish, just give us the content.",
        "Create a central knowledge base where we can find answers quickly.",
        "I want to learn more about industry trends, not just our product specs.",
        "The managers need training on how to coach, not just how to demand numbers.",
        "More peer-to-peer learning sessions would be valuable to share best practices.",
        "The training is too generic, it needs to be tailored to specific verticals.",
        "Actually, the current training program is solid, just keep it up to date."
    ],
    // Fallback
    general: [
        "Sales training should focus more on negotiation skills and objection handling.",
        "Customer feedback tools help identify weak points in our sales process.",
        "Better CRM integration would improve performance tracking significantly.",
        "Need more support from marketing team for lead generation.",
        "The current sales targets are realistic but challenging to achieve.",
        "Product knowledge training has been very helpful for closing deals.",
        "Would benefit from more role-playing exercises in training sessions.",
        "Customer relationship management is key to long-term success.",
        "Sales presentations could be more engaging with better visual aids."
    ]
};

/**
 * Generate rating distribution (non-uniform)
 * Weighted towards positive ratings (4-5)
 */
function generateRating() {
    const rand = Math.random();
    if (rand < 0.33) return 4;      // 33% give rating 4
    if (rand < 0.60) return 5;      // 27% give rating 5
    if (rand < 0.80) return 3;      // 20% give rating 3
    if (rand < 0.93) return 2;      // 13% give rating 2
    return 1;                        // 7% give rating 1
}

/**
 * Get context-aware text response based on question text
 */
function getRandomTextResponse(questionText) {
    if (!questionText) return RESPONSES_BY_CATEGORY.general[Math.floor(Math.random() * RESPONSES_BY_CATEGORY.general.length)];

    const lowerText = questionText.toLowerCase();

    // Check for Obstacles/Challenges themes
    if (lowerText.includes('challenge') || lowerText.includes('obstacle') || lowerText.includes('problem') || lowerText.includes('blocker') || lowerText.includes('barrier')) {
        return RESPONSES_BY_CATEGORY.challenges[Math.floor(Math.random() * RESPONSES_BY_CATEGORY.challenges.length)];
    }

    // Check for CRM/Tools themes
    if (lowerText.includes('crm') || lowerText.includes('tool') || lowerText.includes('system') || lowerText.includes('platform') || lowerText.includes('app')) {
        return RESPONSES_BY_CATEGORY.crm[Math.floor(Math.random() * RESPONSES_BY_CATEGORY.crm.length)];
    }

    // Check for Training/Enablement themes
    if (lowerText.includes('train') || lowerText.includes('learn') || lowerText.includes('skill') || lowerText.includes('enablement') || lowerText.includes('coach')) {
        return RESPONSES_BY_CATEGORY.training[Math.floor(Math.random() * RESPONSES_BY_CATEGORY.training.length)];
    }

    // Fallback
    return RESPONSES_BY_CATEGORY.general[Math.floor(Math.random() * RESPONSES_BY_CATEGORY.general.length)];
}

/**
 * Generate timestamp spread over last 7 days
 */
function generateTimestamp(index, total) {
    const now = new Date();
    const daysAgo = Math.floor((index / total) * 7); // Spread over 7 days
    const hoursVariation = Math.floor(Math.random() * 24);
    const minutesVariation = Math.floor(Math.random() * 60);

    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursVariation);
    timestamp.setMinutes(timestamp.getMinutes() - minutesVariation);

    return timestamp;
}

/**
 * Main seeding function
 */
async function seedTunSaleResponses() {
    try {
        logger.info('🚀 Starting "Tun Sale" survey response seeding...\\n');

        // Test database connection
        await sequelize.authenticate();
        logger.info('✅ Database connection established\\n');

        // Find the "Tun Sale" survey
        logger.info('🔍 Looking for "Tun Sale" survey...');
        const survey = await Survey.findOne({
            where: { title: 'Tun Sale' }
        });

        if (!survey) {
            throw new Error('Survey "Tun Sale" not found. Please ensure it exists in the database.');
        }

        logger.info(`✅ Found survey: "${survey.title}" (ID: ${survey.id})\\n`);

        // Get all question types first
        logger.info('🔍 Loading question types...');
        const questionTypes = await QuestionType.findAll();
        const typeMap = {};
        questionTypes.forEach(qt => {
            typeMap[qt.id] = qt.name;
        });
        logger.info(`✅ Loaded ${questionTypes.length} question types\\n`);

        // Get questions for this survey's template
        logger.info('🔍 Fetching questions...');
        logger.info(`DEBUG: survey.template_id = ${survey.template_id}`);
        logger.info(`DEBUG: Question model defined? ${!!Question}`);

        let questions;
        try {
            logger.info('DEBUG: Attempting simple Question.findOne...');
            const simpler = await Question.findOne();
            logger.info('DEBUG: Simple findOne success!', simpler ? simpler.id : 'null');

            questions = await Question.findAll({
                where: { template_id: survey.template_id },
                // order: [['order', 'ASC']] // Temporarily removing order to test
            });
        } catch (error) {
            console.error("❌ FAILURE FETCHING QUESTIONS:", error);
            throw error;
        }

        if (questions.length === 0) {
            throw new Error(`No questions found for template_id: ${survey.template_id}`);
        }

        logger.info(`✅ Found ${questions.length} questions\\n`);
        questions.forEach((q, idx) => {
            const typeName = typeMap[q.question_type_id] || 'unknown';
            logger.info(`  ${idx + 1}. [${typeName}] ${q.question_text.substring(0, 60)}...`);
        });
        logger.info('');

        // Get or create collector
        let collector = await SurveyCollector.findOne({
            where: { survey_id: survey.id }
        });

        if (!collector) {
            logger.info('📝 Creating collector for survey...');
            collector = await SurveyCollector.create({
                survey_id: survey.id,
                type: 'weblink',
                name: `Analytics Test Data - ${survey.title}`,
                status: 'active',
                settings: {
                    response_limit: null,
                    close_date: null,
                    password_protected: false
                }
            });
            logger.info(`✅ Created collector (ID: ${collector.id})\\n`);
        } else {
            logger.info(`✅ Using existing collector (ID: ${collector.id})\\n`);
        }

        // Get existing users for respondent_id assignment
        const users = await User.findAll({ limit: 10 });

        // Clear existing test responses (optional - make idempotent)
        logger.info('🧹 Checking for existing test responses...');
        const existingResponses = await SurveyResponse.findAll({
            where: {
                survey_id: survey.id,
                is_anonymous: false // Only clear identified test responses
            }
        });

        if (existingResponses.length > 0) {
            logger.info(`⚠️  Found ${existingResponses.length} existing responses. Clearing them for fresh data...`);
            for (const response of existingResponses) {
                await Answer.destroy({ where: { survey_response_id: response.id } });
                await response.destroy();
            }
            logger.info('✅ Cleared existing responses\\n');
        }

        // Create 40 responses
        const NUM_RESPONSES = 40;
        logger.info(`🌱 Creating ${NUM_RESPONSES} realistic responses...\\n`);

        for (let i = 0; i < NUM_RESPONSES; i++) {
            const timestamp = generateTimestamp(i, NUM_RESPONSES);
            const timeTaken = 120 + Math.floor(Math.random() * 300); // 2-7 minutes

            // Assign respondent (80% identified, 20% anonymous)
            const isAnonymous = Math.random() < 0.2;
            const respondentId = isAnonymous ? null : users[i % users.length]?.id || null;

            const response = await SurveyResponse.create({
                survey_id: survey.id,
                collector_id: collector.id,
                respondent_id: respondentId,
                status: 'completed',
                start_time: new Date(timestamp.getTime() - timeTaken * 1000),
                completion_time: timestamp,
                time_taken: timeTaken,
                is_anonymous: isAnonymous,
                created_at: timestamp,
                updated_at: timestamp
            });

            // Create answers for each question
            for (const question of questions) {
                const questionTypeName = typeMap[question.question_type_id] || 'text';
                let answerData = {
                    survey_response_id: response.id,
                    question_id: question.id,
                    created_at: timestamp
                };

                if (questionTypeName === 'rating' || questionTypeName === 'likert') {
                    answerData.numeric_answer = generateRating();
                } else if (questionTypeName === 'text' || questionTypeName === 'long_text') {
                    // 85% provide text answers, 15% skip optional questions
                    if (question.required || Math.random() < 0.85) {
                        answerData.text_answer = getRandomTextResponse(question.question_text);
                    } else {
                        continue; // Skip this question
                    }
                } else if (questionTypeName === 'multiple_choice') {
                    const choices = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'];
                    answerData.text_answer = choices[Math.floor(Math.random() * choices.length)];
                } else {
                    answerData.text_answer = 'Sample answer';
                }

                await Answer.create(answerData);
            }

            // Progress indicator
            if ((i + 1) % 10 === 0) {
                logger.info(`  ✅ Created ${i + 1}/${NUM_RESPONSES} responses...`);
            }
        }

        logger.info(`\\n✅ Successfully created ${NUM_RESPONSES} responses!\\n`);

        // Verification
        logger.info('🔍 Verifying data...');
        const totalResponses = await SurveyResponse.count({
            where: { survey_id: survey.id }
        });
        const totalAnswers = await Answer.count({
            include: [{
                model: SurveyResponse,
                where: { survey_id: survey.id }
            }]
        });

        logger.info(`  📊 Total responses: ${totalResponses}`);
        logger.info(`  📝 Total answers: ${totalAnswers}`);
        logger.info(`  📈 Average answers per response: ${(totalAnswers / totalResponses).toFixed(1)}\\n`);

        // Rating distribution check
        logger.info('📊 Rating distribution:');
        const ratingQuestion = questions.find(q => {
            const typeName = typeMap[q.question_type_id];
            return typeName === 'rating' || typeName === 'likert';
        });

        if (ratingQuestion) {
            for (let rating = 1; rating <= 5; rating++) {
                const count = await Answer.count({
                    where: {
                        question_id: ratingQuestion.id,
                        numeric_answer: rating
                    }
                });
                const percentage = ((count / totalResponses) * 100).toFixed(1);
                logger.info(`  Rating ${rating}: ${count} responses (${percentage}%)`);
            }
        }

        logger.info('\\n' + '='.repeat(60));
        logger.info('✅ Seeding completed successfully!');
        logger.info('='.repeat(60));
        logger.info('\\n📌 Next steps:');
        logger.info('  1. Navigate to the Analytics Dashboard');
        logger.info('  2. Select the "Tun Sale" survey');
        logger.info('  3. Verify charts and statistics are displaying correctly\\n');

        process.exit(0);
    } catch (error) {
        logger.error('\\n❌ Seeding failed:', error.message);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    seedTunSaleResponses();
}

module.exports = { seedTunSaleResponses };
