#! /bin/bash
# MakeFile for creating corpus-tools-ec-arrernte repo
# Override BASE_DATA_DIR, REPO_OUT_DIR, BASE_TMP_DIR to point to the location of your datasets

BASE_DATA_DIR=/data
REPO_SCRATCH_DIR=scratch

REPO_OUT_DIR=./ocfl-repo
BASE_TMP_DIR=temp

REPO_NAME=LDaCA
NAMESPACE=ec-arrernte-dictionary-recordings
CORPUS_NAME=ec-arrernte-dictionary-recordings
JSON=${BASE_DATA_DIR}/override
DATA_DIR=${BASE_DATA_DIR}/override
TEMP_DIR=${BASE_TMP_DIR}
TEMPLATE_DIR=./template
DEBUG=true

.DEFAULT_GOAL := repo

repo :
	node index.js -s ${NAMESPACE} \
		-t "${TEMPLATE_DIR}" \
		-c ${CORPUS_NAME} -n ${REPO_NAME} \
		-r "${REPO_OUT_DIR}" -x "${JSON}" \
		-d "${DATA_DIR}" \
		-D ${DEBUG} \
		-p "${TEMP_DIR}" -z "${REPO_SCRATCH_DIR}"


clean :
	rm -rf ${TEMP_DIR}
