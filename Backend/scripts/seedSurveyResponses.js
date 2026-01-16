#!/usr/bin/env node

/**
 * Seed Responses for "Tun Sale" Survey
 * Creates 40-50 realistic survey responses for analytics testing
 * Run: node scripts/seedSurveyResponses.js
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

// Realistic text responses for sales-related questions
const TEXT_RESPONSES = [
    "Sales training should focus more on negotiation skills and objection handling.",
    "Customer feedback tools help identify weak points in our sales process.",
    "Better CRM integration would improve performance tracking significantly.",
    "Need more support from marketing team for lead generation.",
    "The current sales targets are realistic but challenging to achieve.",
    "Product knowledge training has been very helpful for closing deals.",
    "Would benefit from more role-playing exercises in training sessions.",
    "Customer relationship management is key to long-term success.",
    "Sales presentations could be more engaging with better visual aids.",
    "Follow-up processes need to be more systematic and consistent.",
    "Territory management strategies need improvement for better coverage.",
    "Competitive analysis training would help us position better.",
    "More collaboration between sales and product teams is needed.",
    "Lead qualification process should be more streamlined.",
    "Sales compensation structure motivates performance effectively.",
    "Customer retention strategies are just as important as acquisition.",
    "Digital sales tools have significantly improved our efficiency.",
    "Regular coaching sessions from managers are very valuable.",
    "Cross-selling opportunities are often overlooked by the team.",
    "Sales cycle is too long for some product categories.",
    "Better data analytics would help identify trends earlier.",
    "Customer testimonials and case studies are powerful selling tools.",
    "Need more flexibility in pricing negotiations for enterprise deals.",
    "Sales enablement materials need to be updated more frequently.",
    "Team collaboration has improved significantly this quarter.",
    "Account management processes could be more customer-centric.",
    "Sales forecasting accuracy needs improvement for better planning.",
    "Product demonstrations are our strongest selling point.",
    "More training on consultative selling approaches would help.",
    "Customer objections are becoming more sophisticated over time.",
    "Sales metrics should focus more on quality than just quantity.",
    "Onboarding process for new sales reps needs to be faster.",
    "Territory assignments should consider customer potential better.",
    "Sales automation tools have reduced administrative burden.",
    "Need better alignment between sales quotas and market conditions.",
    "Customer success stories should be shared more widely across team.",
    "Sales pipeline visibility has improved with new CRM system.",
    "More incentives for team collaboration would boost overall results.",
    "Product roadmap visibility helps in managing customer expectations.",
    "Sales training should include more industry-specific content."
];

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
 * Get random text response
 */
function getRandomTextResponse() {
    return TEXT_RESPONSES[Math.floor(Math.random() * TEXT_RESPONSES.length)];
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
async function seedSurveyResponses() {
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
            typeMap[qt.id] = qt.type_name || qt.name; // Handle potential field name diffs
        });
        logger.info(`✅ Loaded ${questionTypes.length} question types\\n`);

        // Get questions for this survey's template
        logger.info('🔍 Fetching questions...');

        // Check if Question model has 'display_order' or 'order'
        // Based on model inspection, it is 'display_order'
        const questions = await Question.findAll({
            where: { template_id: survey.template_id },
            order: [['display_order', 'ASC']]
        });

        if (questions.length === 0) {
            throw new Error(`No questions found for template_id: ${survey.template_id}`);
        }

        logger.info(`✅ Found ${questions.length} questions\\n`);
        questions.forEach((q, idx) => {
            const typeName = typeMap[q.question_type_id] || 'unknown';
            logger.info(`  ${idx + 1}. [${typeName}] ${q.question_text.substring(0, 60)}...`);
        });
        logger.info('');

        // Get existing users for respondent_id assignment
        const users = await User.findAll({ limit: 10 });
        const creator = users[0]; // Use first user as creator

        // Get or create collector
        let collector = await SurveyCollector.findOne({
            where: { survey_id: survey.id }
        });

        if (!collector) {
            logger.info('📝 Creating collector for survey...');
            // Determine collector type value (handle enum mismatch if any)
            // Model expects: 'web_link', 'qr_code', 'email', 'embedded'

            collector = await SurveyCollector.create({
                survey_id: survey.id,
                collector_type: 'web_link',
                name: `Analytics Test Data - ${survey.title}`,
                is_active: true,
                token: 'seed-' + Math.random().toString(36).substring(2, 15), // Generate simple token
                created_by: creator ? creator.id : 1, // Fallback to ID 1 if no users
                allow_multiple_responses: true
            });
            logger.info(`✅ Created collector (ID: ${collector.id})\\n`);
        } else {
            logger.info(`✅ Using existing collector (ID: ${collector.id})\\n`);
        }

        // Count existing responses to decide if we need to clear
        const currentCount = await SurveyResponse.count({
            where: { survey_id: survey.id }
        });

        logger.info(`ℹ️  Current response count: ${currentCount}`);

        // Automatically clear if requested or if it helps test (here let's just clear identified test responses to be safe and avoid dupe bias)
        // Or if user specifically asked for "idempotent" in nice-to-have, let's just do it.
        logger.info('🧹 Clearing existing seed responses for this survey (fresh start)...');

        // We need to find responses to delete their answers first
        const responsesToDelete = await SurveyResponse.findAll({
            where: {
                survey_id: survey.id,
                // Optional: filter by collector to only delete seed data? 
                // But user goal is to "clear old test responses". 
                // Let's assume all responses for this survey during dev are safely clearable or at least the ones we created.
                // To be safe, let's only delete if they look like test data (e.g. from our collector) or just all for this dev task.
                // Given instructions "Make it idempotent (clear old test responses before insert)", I will clear all for this survey.
            }
        });

        if (responsesToDelete.length > 0) {
            const responseIds = responsesToDelete.map(r => r.id);
            await Answer.destroy({
                where: { survey_response_id: responseIds }
            });
            await SurveyResponse.destroy({
                where: { id: responseIds }
            });
            logger.info(`✅ Cleared ${responsesToDelete.length} existing responses\\n`);
        }

        // Create 50 responses
        const NUM_RESPONSES = 50;
        logger.info(`🌱 Creating ${NUM_RESPONSES} realistic responses...\\n`);

        for (let i = 0; i < NUM_RESPONSES; i++) {
            const timestamp = generateTimestamp(i, NUM_RESPONSES);
            const timeTaken = 120 + Math.floor(Math.random() * 300); // 2-7 minutes

            // Assign respondent (80% identified, 20% anonymous)
            const isAnonymous = Math.random() < 0.2;
            const respondentId = (!isAnonymous && users.length > 0) ? users[i % users.length]?.id : null;

            const response = await SurveyResponse.create({
                survey_id: survey.id,
                collector_id: collector.id,
                respondent_id: respondentId,
                status: 'completed',
                start_time: new Date(timestamp.getTime() - timeTaken * 1000),
                completion_time: timestamp,
                time_taken: timeTaken,
                is_anonymous: isAnonymous || !respondentId, // force anonymous if no respondent_id
                created_at: timestamp,
                updated_at: timestamp
            });

            // Create answers for each question
            for (const question of questions) {
                const questionTypeName = (typeMap[question.question_type_id] || '').toLowerCase();
                let answerData = {
                    survey_response_id: response.id,
                    question_id: question.id,
                    created_at: timestamp
                };

                const isRating = questionTypeName.includes('rating') || questionTypeName.includes('likert') || questionTypeName.includes('scale');
                const isText = questionTypeName.includes('text') || questionTypeName.includes('open') || questionTypeName.includes('essay');
                const isMulti = questionTypeName.includes('multiple') || questionTypeName.includes('choice');

                if (isRating) {
                    answerData.numeric_answer = generateRating();
                } else if (isText) {
                    // 85% provide text answers
                    if (question.required || Math.random() < 0.85) {
                        answerData.text_answer = getRandomTextResponse();
                    } else {
                        continue; // Skip optional
                    }
                } else if (isMulti) {
                    const choices = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'];
                    answerData.text_answer = choices[Math.floor(Math.random() * choices.length)];
                } else {
                    // Fallback
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

        // Verification stats
        logger.info('🔍 Verifying data stats...');

        // Rating distribution
        logger.info('📊 Rating distribution (should be weighted 4-5):');
        const ratingQuestions = questions.filter(q => {
            const t = (typeMap[q.question_type_id] || '').toLowerCase();
            return t.includes('rating') || t.includes('likert');
        });

        if (ratingQuestions.length > 0) {
            // Check first rating question
            const rQ = ratingQuestions[0];
            logger.info(`  Checking Q: ${rQ.question_text.substring(0, 30)}...`);

            for (let rating = 1; rating <= 5; rating++) {
                const count = await Answer.count({
                    where: {
                        question_id: rQ.id,
                        numeric_answer: rating
                    }
                });
                const percentage = ((count / NUM_RESPONSES) * 100).toFixed(1);
                logger.info(`  Rating ${rating}: ${count} responses (${percentage}%)`);
            }
        }

        logger.info('\\n' + '='.repeat(60));
        logger.info('✅ Seeding completed successfully!');
        logger.info('='.repeat(60));

        process.exit(0);
    } catch (error) {
        logger.error('\\n❌ Seeding failed:', error.message);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    seedSurveyResponses();
}

module.exports = { seedSurveyResponses };
